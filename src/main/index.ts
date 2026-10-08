import {
    app, BrowserWindow, ipcMain, dialog, shell, session, powerMonitor, Menu,
    WebContents, IpcMainEvent, IpcMainInvokeEvent, MenuItemConstructorOptions
} from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { store } from './store';
import { vault, NewCredential } from './vault';
import { installPermissionHandlers, permissions, PermissionPrompt } from './permissions';
import { createAccountManager, SIGN_IN_URL } from './account';

const { ElectronBlocker, fromElectronDetails } = require('@cliqz/adblocker-electron');
const crossFetch = require('cross-fetch');

const isMac = process.platform === 'darwin';
const isDev = !app.isPackaged;
const DEV_SERVER_URL = 'http://localhost:5173';

const BROWSING_PARTITION = 'persist:underlay';
const INCOGNITO_PARTITION = 'underlay-incognito';

let mainWindow: BrowserWindow | null = null;

declare global {
    var widevineStatus: string;
}

// ---------------------------------------------------------------------------
// Native URL filter (optional). Falls back to JS if the addon isn't built.
// ---------------------------------------------------------------------------

interface UrlEngine {
    addBlockPattern(pattern: string): void;
    checkUrl(url: string): { blocked: boolean };
}

function createUrlEngine(): UrlEngine {
    try {
        const addon = require('bindings')('addon');
        return new addon.EngineCore();
    } catch (e) {
        console.warn('[Engine] Native addon unavailable, using JS filter:', (e as Error).message);
        const patterns: string[] = [];
        return {
            addBlockPattern: (pattern) => { patterns.push(pattern); },
            checkUrl: (url) => ({ blocked: patterns.some(p => url.includes(p)) })
        };
    }
}

const engine = createUrlEngine();
engine.addBlockPattern('tracker');
engine.addBlockPattern('analytics');

// ---------------------------------------------------------------------------
// User agent: the real Chromium version Electron ships, minus the Electron
// and app tokens, with the minor version reduced the same way Chrome does.
// Claiming an old or wrong-platform Chrome breaks sites and is a fingerprint.
// ---------------------------------------------------------------------------

const USER_AGENT = app.userAgentFallback
    .replace(/\s?Electron\/\S+/i, '')
    .replace(new RegExp(`\\s?${app.getName()}\\/\\S+`, 'i'), '')
    .replace(/Chrome\/(\d+)\.[\d.]+/, 'Chrome/$1.0.0.0');
app.userAgentFallback = USER_AGENT;

// ---------------------------------------------------------------------------
// Chromium switches. `enable-features` must be passed exactly once: Chromium
// only honours the last occurrence, which silently dropped most of the list.
// Flags that weakened site isolation, ignored the GPU blocklist, exposed
// SharedArrayBuffer everywhere or kept background tabs running at full speed
// have been removed.
// ---------------------------------------------------------------------------

app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-smooth-scrolling');
app.commandLine.appendSwitch('site-per-process');
app.commandLine.appendSwitch('enable-quic');
app.commandLine.appendSwitch('dns-over-https-mode', 'automatic');
app.commandLine.appendSwitch('dns-over-https-templates', 'https://chrome.cloudflare-dns.com/dns-query');
app.commandLine.appendSwitch('enable-features', [
    'BackForwardCache',
    'ThirdPartyStoragePartitioning',
    'PartitionedCookies',
    'OverlayScrollbar',
    'NetworkPrediction'
].join(','));

// ---------------------------------------------------------------------------
// Widevine (only effective with a Widevine-enabled Electron build).
// ---------------------------------------------------------------------------

function setupWidevine() {
    if (!isMac && process.platform !== 'win32') return;

    const versionDirs = (dir: string) => {
        try {
            return fs.readdirSync(dir).filter(v => /^\d+\.\d+\.\d+\.\d+$/.test(v));
        } catch {
            return [];
        }
    };
    const newest = (versions: string[]) => versions.sort((a, b) => {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < 4; i++) if (pa[i] !== pb[i]) return pb[i] - pa[i];
        return 0;
    })[0];

    const roots = isMac
        ? [
            '/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions',
            '/Applications/Brave Browser.app/Contents/Frameworks/Brave Browser Framework.framework/Versions',
            '/Applications/Microsoft Edge.app/Contents/Frameworks/Microsoft Edge Framework.framework/Versions'
        ]
        : (() => {
            const localAppData = process.env.LOCALAPPDATA || '';
            const programFiles = process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES || 'C:\\Program Files';
            return [
                path.join(programFiles, 'Google/Chrome/Application'),
                path.join(programFiles, 'Microsoft/Edge/Application'),
                path.join(programFiles, 'BraveSoftware/Brave-Browser/Application'),
                path.join(localAppData, 'Google/Chrome/User Data/WidevineCdm'),
                path.join(localAppData, 'Microsoft/Edge/User Data/WidevineCdm')
            ];
        })();

    for (const root of roots) {
        const version = newest(versionDirs(root));
        if (!version) continue;
        const candidates = isMac
            ? (os.arch() === 'arm64' ? ['mac_arm64', 'mac_x64'] : ['mac_x64']).map(arch =>
                path.join(root, version, 'Libraries/WidevineCdm/_platform_specific', arch, 'libwidevinecdm.dylib'))
            : [
                path.join(root, version, 'WidevineCdm', '_platform_specific', 'win_x64', 'widevinecdm.dll'),
                path.join(root, version, '_platform_specific', 'win_x64', 'widevinecdm.dll')
            ];
        const cdmPath = candidates.find(c => fs.existsSync(c));
        if (cdmPath) {
            app.commandLine.appendSwitch('widevine-cdm-path', cdmPath);
            app.commandLine.appendSwitch('widevine-cdm-version', version);
            if (isDev) app.commandLine.appendSwitch('no-verify-widevine-cdm');
            global.widevineStatus = 'success';
            console.log(`[Widevine] Using ${cdmPath} (${version})`);
            return;
        }
    }
    global.widevineStatus = 'failed';
    console.warn('[Widevine] CDM not found; DRM playback will be unavailable.');
}
setupWidevine();

// ---------------------------------------------------------------------------
// Privacy preferences (owned by the main process so they apply to requests).
// ---------------------------------------------------------------------------

interface PrivacyPrefs {
    shields: boolean;
    httpsUpgrade: boolean;
    globalPrivacyControl: boolean;
    searchSuggestions: boolean;
}

const DEFAULT_PRIVACY: PrivacyPrefs = { shields: true, httpsUpgrade: true, globalPrivacyControl: true, searchSuggestions: true };
let privacy: PrivacyPrefs = { ...DEFAULT_PRIVACY, ...store.get<Partial<PrivacyPrefs>>('privacy', {}) };

// ---------------------------------------------------------------------------
// Ad & tracker blocking. The compiled engine is cached on disk so startup
// doesn't depend on the network, and refreshed in the background when stale.
// ---------------------------------------------------------------------------

let adBlocker: any = null;
const ADBLOCK_CACHE = path.join(app.getPath('userData'), 'adblock-engine.bin');
const ADBLOCK_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

async function loadAdBlocker() {
    let cacheAge = Infinity;
    try {
        const stat = await fs.promises.stat(ADBLOCK_CACHE);
        cacheAge = Date.now() - stat.mtimeMs;
        adBlocker = ElectronBlocker.deserialize(new Uint8Array(await fs.promises.readFile(ADBLOCK_CACHE)));
        console.log('[AdBlock] Loaded cached engine');
    } catch {
        // No cache yet.
    }
    if (adBlocker && cacheAge < ADBLOCK_MAX_AGE_MS) return;
    try {
        const fresh = await ElectronBlocker.fromPrebuiltAdsAndTracking(crossFetch);
        adBlocker = fresh;
        await fs.promises.writeFile(ADBLOCK_CACHE, fresh.serialize());
        console.log('[AdBlock] Engine updated');
    } catch (e) {
        console.warn('[AdBlock] Update failed, using cached engine if any:', (e as Error).message);
    }
}

// Hosts that must never be blocked (sign-in, video delivery, benchmarks).
// Matched on the hostname: a substring match on the full URL let any tracker
// through as long as "google.com" appeared somewhere in its query string.
const ALLOWED_HOST_SUFFIXES = ['google.com', 'gstatic.com', 'googleapis.com', 'googlevideo.com', 'youtube.com', 'browserbench.org', 'localhost'];

function hostMatches(hostname: string, suffixes: string[]) {
    return suffixes.some(s => hostname === s || hostname.endsWith(`.${s}`));
}

function classifyBlocked(url: string): string {
    const u = url.toLowerCase();
    if (/miner|coinhive|cryptonight/.test(u)) return 'Cryptominer';
    if (/fingerprint|fpjs|canvas/.test(u)) return 'Fingerprinter';
    if (/facebook|twitter|linkedin|tiktok|pinterest|social/.test(u)) return 'Social';
    if (/track|analytics|segment|telemetry|pixel|beacon|metrics/.test(u)) return 'Tracker';
    return 'Ad';
}

// Blocked-request reports are batched so a page with hundreds of trackers
// doesn't flood the UI thread with IPC.
let blockedQueue: object[] = [];
let blockedTimer: NodeJS.Timeout | null = null;

function reportBlocked(url: string, hostname: string, type: string, webContentsId?: number) {
    blockedQueue.push({ url, domain: hostname, type, timestamp: Date.now(), tabId: webContentsId });
    if (!blockedTimer) {
        blockedTimer = setTimeout(() => {
            sendToUI('privacy:tracker-blocked-batch', blockedQueue);
            blockedQueue = [];
            blockedTimer = null;
        }, 1000);
    }
}

// ---------------------------------------------------------------------------
// HTTPS upgrades with automatic fallback, like Chrome's HTTPS-Upgrades.
// ---------------------------------------------------------------------------

const upgradedHosts = new Set<string>();
const httpFallbackHosts = new Set<string>();

function isLocalOrIntranet(hostname: string) {
    return hostname === 'localhost'
        || !hostname.includes('.')
        || hostname.endsWith('.local')
        || hostname.endsWith('.localhost')
        || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
        || hostname.startsWith('[');
}

// ---------------------------------------------------------------------------
// Window & IPC plumbing
// ---------------------------------------------------------------------------

function sendToUI(channel: string, payload?: unknown) {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function isTrustedUIUrl(url: string | undefined) {
    if (!url) return false;
    if (isDev) return url.startsWith(DEV_SERVER_URL);
    return url.startsWith('file://') && url.includes('/renderer/index.html');
}

function isUIContents(contents: WebContents | null | undefined) {
    return !!contents && !!mainWindow && !mainWindow.isDestroyed() && contents.id === mainWindow.webContents.id;
}

function fromUI(event: IpcMainEvent | IpcMainInvokeEvent) {
    return isUIContents(event.sender) && isTrustedUIUrl(event.senderFrame?.url);
}

// Only the browser UI may talk to the main process; web content never can.
function handle(channel: string, fn: (...args: any[]) => unknown) {
    ipcMain.handle(channel, (event, ...args) => {
        if (!fromUI(event)) throw new Error(`Blocked IPC call to ${channel}`);
        return fn(...args);
    });
}

function listen(channel: string, fn: (...args: any[]) => void) {
    ipcMain.on(channel, (event, ...args) => {
        if (fromUI(event)) fn(...args);
    });
}

function isWebUrl(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    try {
        return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts. Handled in the main process so they work no matter
// whether the UI or a web page has focus, and so macOS doesn't close the
// whole window on ⌘W.
// ---------------------------------------------------------------------------

function commandForInput(input: Electron.Input): string | null {
    if (input.type !== 'keyDown') return null;
    const mod = isMac ? input.meta : input.control;
    const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;

    if (input.control && key === 'Tab') return input.shift ? 'prev-tab' : 'next-tab';
    if (!isMac && input.alt && !mod && key === 'ArrowLeft') return 'back';
    if (!isMac && input.alt && !mod && key === 'ArrowRight') return 'forward';
    if (!isMac && key === 'F5') return input.control ? 'hard-reload' : 'reload';
    if (!mod) return null;

    if (input.alt && key === 'c') return 'customize-toolbar';
    if (input.alt) return null;
    if (input.shift) {
        switch (key) {
            case 'n': return 'new-incognito-tab';
            case 't': return 'reopen-closed-tab';
            case 'o': return 'library';
            case 'r': return 'hard-reload';
            case '+': return 'zoom-in';
            default: return null;
        }
    }
    switch (key) {
        case 't': return 'new-tab';
        case 'w': return 'close-tab';
        case 'l': return 'focus-address-bar';
        case 'k': return 'command-palette';
        case 'r': return 'reload';
        case '[': return 'back';
        case ']': return 'forward';
        case ',': return 'settings';
        case '=': case '+': return 'zoom-in';
        case '-': return 'zoom-out';
        case '0': return 'zoom-reset';
        case 'y': return isMac ? 'library' : null;
        default:
            if (/^[1-9]$/.test(key)) return `select-tab-${key}`;
            return null;
    }
}

function attachShortcuts(contents: WebContents) {
    contents.on('before-input-event', (event, input) => {
        // Popups (e.g. OAuth) and DevTools keep their own shortcuts, so ⌘W
        // closes the popup rather than the user's current tab.
        if (contents.getType() !== 'webview' && !isUIContents(contents)) return;
        const command = commandForInput(input);
        if (command) {
            event.preventDefault();
            sendToUI('ui:command', command);
        }
    });
}

function buildMenu() {
    const command = (name: string) => () => sendToUI('ui:command', name);
    const mod = 'CmdOrCtrl';
    const template: MenuItemConstructorOptions[] = [
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { label: 'Settings…', accelerator: `${mod}+,`, click: command('settings') },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        } as MenuItemConstructorOptions] : []),
        {
            label: 'File',
            submenu: [
                { label: 'New Tab', accelerator: `${mod}+T`, click: command('new-tab') },
                { label: 'New Private Tab', accelerator: `${mod}+Shift+N`, click: command('new-incognito-tab') },
                { label: 'Reopen Closed Tab', accelerator: `${mod}+Shift+T`, click: command('reopen-closed-tab') },
                { label: 'Open Location…', accelerator: `${mod}+L`, click: command('focus-address-bar') },
                { type: 'separator' },
                { label: 'Close Tab', accelerator: `${mod}+W`, click: command('close-tab') },
                ...(isMac ? [] : [{ type: 'separator' }, { role: 'quit' }] as MenuItemConstructorOptions[])
            ]
        },
        { role: 'editMenu' },
        {
            label: 'View',
            submenu: [
                { label: 'Reload Page', accelerator: `${mod}+R`, click: command('reload') },
                { label: 'Reload Ignoring Cache', accelerator: `${mod}+Shift+R`, click: command('hard-reload') },
                { type: 'separator' },
                { label: 'Zoom In', accelerator: `${mod}+=`, click: command('zoom-in') },
                { label: 'Zoom Out', accelerator: `${mod}+-`, click: command('zoom-out') },
                { label: 'Actual Size', accelerator: `${mod}+0`, click: command('zoom-reset') },
                { type: 'separator' },
                { label: 'Command Palette', accelerator: `${mod}+K`, click: command('command-palette') },
                { role: 'togglefullscreen' },
                ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools', label: 'Toggle Browser UI DevTools' }] as MenuItemConstructorOptions[] : [])
            ]
        },
        {
            label: 'History',
            submenu: [
                { label: 'Back', accelerator: `${mod}+[`, click: command('back') },
                { label: 'Forward', accelerator: `${mod}+]`, click: command('forward') },
                { type: 'separator' },
                { label: 'Show All History', accelerator: `${mod}+Shift+O`, click: command('library') }
            ]
        },
        { role: 'windowMenu' }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------------------------------------------------------------------------
// Session configuration
// ---------------------------------------------------------------------------

const downloadPaths = new Set<string>();
let downloadSeq = 0;

function configureDownloads(ses: Electron.Session) {
    ses.on('will-download', (_event, item) => {
        const id = `${Date.now()}-${++downloadSeq}`;
        const base = { id, filename: item.getFilename(), url: item.getURL() };

        sendToUI('download:update', { ...base, state: 'progressing', receivedBytes: 0, totalBytes: item.getTotalBytes() });

        item.on('updated', (_e, state) => {
            sendToUI('download:update', {
                id,
                state: state === 'interrupted' ? 'interrupted' : item.isPaused() ? 'paused' : 'progressing',
                receivedBytes: item.getReceivedBytes(),
                totalBytes: item.getTotalBytes()
            });
        });

        item.once('done', (_e, state) => {
            const savePath = item.getSavePath();
            if (state === 'completed' && savePath) downloadPaths.add(savePath);
            sendToUI('download:update', {
                ...base,
                path: savePath,
                state: state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'failed',
                receivedBytes: item.getReceivedBytes(),
                totalBytes: item.getTotalBytes()
            });
        });
    });
}

function configureBrowsingSession(ses: Electron.Session, incognito: boolean) {
    ses.setUserAgent(USER_AGENT);
    configureDownloads(ses);

    ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
        let url: URL;
        try {
            url = new URL(details.url);
        } catch {
            return callback({});
        }

        if (details.resourceType === 'mainFrame') {
            if (
                privacy.httpsUpgrade && url.protocol === 'http:' && !url.port &&
                !isLocalOrIntranet(url.hostname) && !httpFallbackHosts.has(url.hostname)
            ) {
                upgradedHosts.add(url.hostname);
                url.protocol = 'https:';
                return callback({ redirectURL: url.toString() });
            }
            // Never block a page the user explicitly navigated to.
            return callback({});
        }

        if (!privacy.shields || hostMatches(url.hostname, ALLOWED_HOST_SUFFIXES)) return callback({});

        if (engine.checkUrl(details.url).blocked) {
            reportBlocked(details.url, url.hostname, 'Tracker', details.webContentsId);
            return callback({ cancel: true });
        }

        if (adBlocker) {
            const result = adBlocker.match(fromElectronDetails(details));
            if (result.redirect) return callback({ redirectURL: result.redirect.dataUrl });
            if (result.match) {
                reportBlocked(details.url, url.hostname, classifyBlocked(details.url), details.webContentsId);
                return callback({ cancel: true });
            }
        }
        callback({});
    });

    ses.webRequest.onBeforeSendHeaders((details, callback) => {
        const requestHeaders = details.requestHeaders;
        if (privacy.globalPrivacyControl) {
            requestHeaders['Sec-GPC'] = '1';
            requestHeaders['DNT'] = '1';
        }
        callback({ requestHeaders });
    });

    ses.webRequest.onHeadersReceived((details, callback) => {
        // Google Earth needs cross-origin isolation for SharedArrayBuffer.
        if (details.resourceType === 'mainFrame' && /^https:\/\/earth\.google\.com\//.test(details.url)) {
            return callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Cross-Origin-Opener-Policy': ['same-origin'],
                    'Cross-Origin-Embedder-Policy': ['require-corp']
                }
            });
        }
        callback({});
    });

    installPermissionHandlers(ses, { persistent: !incognito, prompt: promptPermission });
}

function promptPermission(request: PermissionPrompt) {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    sendToUI('security:permission-request', request);
    return true;
}

// ---------------------------------------------------------------------------
// Web content hardening
// ---------------------------------------------------------------------------

function routeWindowOpen(contents: WebContents, incognito: boolean) {
    contents.setWindowOpenHandler(({ url, disposition, features }) => {
        if (!isWebUrl(url) && url !== 'about:blank') return { action: 'deny' };

        // window.open() with a size is a real popup (OAuth, payment, etc.) and
        // needs window.opener, so it gets its own small window.
        if (disposition === 'new-window' && /(width|height)=/.test(features)) {
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    parent: mainWindow ?? undefined,
                    autoHideMenuBar: true,
                    backgroundColor: '#ffffff',
                    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
                }
            };
        }

        // Everything else (target=_blank links, middle clicks) opens as a tab.
        sendToUI('tabs:open', { url, incognito, background: disposition === 'background-tab' });
        return { action: 'deny' };
    });
}

app.on('web-contents-created', (_event, contents) => {
    attachShortcuts(contents);

    // A page can never navigate or open windows to anything but the web.
    contents.on('will-navigate', (event, url) => {
        if (isUIContents(contents)) {
            if (!isTrustedUIUrl(url)) event.preventDefault();
            return;
        }
        if (!isWebUrl(url) && url !== 'about:blank' && !url.startsWith('blob:')) event.preventDefault();
    });

    if (contents.getType() === 'webview') {
        const incognito = contents.session === session.fromPartition(INCOGNITO_PARTITION);
        routeWindowOpen(contents, incognito);

        contents.on('did-create-window', (popup) => {
            popup.webContents.setUserAgent(USER_AGENT);
            routeWindowOpen(popup.webContents, incognito);
        });

        // HTTPS upgrade fallback: if an upgraded site has no working HTTPS,
        // remember that and load it over HTTP instead.
        contents.on('did-fail-load', (_e, errorCode, _desc, validatedURL, isMainFrame) => {
            if (!isMainFrame || errorCode === -3) return;
            try {
                const url = new URL(validatedURL);
                if (url.protocol === 'https:' && upgradedHosts.has(url.hostname)) {
                    upgradedHosts.delete(url.hostname);
                    httpFallbackHosts.add(url.hostname);
                    url.protocol = 'http:';
                    contents.loadURL(url.toString());
                }
            } catch { }
        });
        contents.on('did-navigate', (_e, url) => {
            try {
                const { protocol, hostname } = new URL(url);
                if (protocol === 'https:') upgradedHosts.delete(hostname);
            } catch { }
        });

        contents.on('context-menu', (_e, params) => {
            sendToUI('ui:context-menu', {
                x: params.x,
                y: params.y,
                selectionText: params.selectionText,
                mediaType: params.mediaType,
                srcUrl: params.srcURL,
                linkUrl: params.linkURL,
                isEditable: params.isEditable
            });
        });

        // Netflix DRM failure: hand the page to the system browser.
        contents.on('did-finish-load', () => {
            if (!/^https:\/\/(www\.)?netflix\.com\//.test(contents.getURL())) return;
            contents.executeJavaScript(`(() => {
                if (window.__underlayDrmWatch) return;
                window.__underlayDrmWatch = true;
                const check = () => {
                    if (/M7701-100[23]/.test(document.body?.innerText || '')) console.log('UNDERLAY_DRM_FAILURE');
                };
                check();
                new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
            })()`).catch(() => { });
        });
        contents.on('console-message', (event) => {
            if (event.message === 'UNDERLAY_DRM_FAILURE') shell.openExternal(contents.getURL());
        });
    }
});

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 640,
        minHeight: 420,
        show: false,
        frame: false,
        backgroundColor: '#0f0f11',
        titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
        trafficLightPosition: isMac ? { x: 16, y: 14 } : undefined,
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webviewTag: true,
            spellcheck: true
        }
    });

    const ui = mainWindow.webContents;
    ui.setWindowOpenHandler(() => ({ action: 'deny' }));

    // Every <webview> is forced into a locked-down configuration, whatever
    // attributes the UI (or an XSS in it) asked for.
    ui.on('will-attach-webview', (event, webPreferences, params) => {
        delete (webPreferences as any).preload;
        webPreferences.nodeIntegration = false;
        webPreferences.nodeIntegrationInSubFrames = false;
        webPreferences.contextIsolation = true;
        webPreferences.sandbox = true;
        webPreferences.webSecurity = true;
        webPreferences.allowRunningInsecureContent = false;
        webPreferences.experimentalFeatures = false;
        webPreferences.plugins = true;

        const partitionOk = params.partition === BROWSING_PARTITION || params.partition === INCOGNITO_PARTITION;
        const srcOk = !params.src || params.src === 'about:blank' || isWebUrl(params.src);
        if (!partitionOk || !srcOk) {
            console.warn('[Security] Refused to attach webview:', params.src, params.partition);
            event.preventDefault();
        }
    });

    if (isDev) {
        mainWindow.loadURL(DEV_SERVER_URL);
        ui.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.maximize();
    mainWindow.once('ready-to-show', () => mainWindow?.show());
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ---------------------------------------------------------------------------
// App lifecycle & IPC
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
    const browsing = session.fromPartition(BROWSING_PARTITION);
    const incognito = session.fromPartition(INCOGNITO_PARTITION);

    configureBrowsingSession(browsing, false);
    configureBrowsingSession(incognito, true);

    // The browser UI itself (weather widget, avatars) uses the default session.
    session.defaultSession.setUserAgent(USER_AGENT);
    installPermissionHandlers(session.defaultSession, {
        persistent: true,
        isApp: () => true,
        prompt: promptPermission
    });

    loadAdBlocker();
    buildMenu();

    const account = createAccountManager(browsing, (value) => sendToUI('account:changed', value));

    // --- Power
    const sendPower = () => sendToUI('power:state-changed', { isOnBattery: powerMonitor.isOnBatteryPower() });
    powerMonitor.on('on-battery', sendPower);
    powerMonitor.on('on-ac', sendPower);
    handle('power:get-state', () => ({ isOnBattery: powerMonitor.isOnBatteryPower() }));

    // --- Onboarding
    handle('onboarding:get-status', () => store.get('onboardingCompleted', false));
    listen('onboarding:complete', () => store.set('onboardingCompleted', true));
    listen('onboarding:reset', () => store.set('onboardingCompleted', false));

    // --- Account
    handle('account:get', () => account.get());
    handle('account:refresh', () => account.refresh());
    handle('account:sign-out', () => account.signOut());
    handle('account:sign-in-url', () => SIGN_IN_URL);

    // --- Passwords
    handle('vault:status', () => vault.status());
    handle('vault:list', () => vault.list());
    handle('vault:add', (input: NewCredential) => vault.add(input));
    handle('vault:remove', (id: string) => vault.remove(id));
    handle('vault:copy', (id: string) => vault.copy(id));
    handle('vault:import-legacy', (items: NewCredential[]) => vault.importLegacy(items));

    // --- Permissions
    listen('security:response', (payload: { id: unknown; allow: unknown }) => permissions.respond(payload?.id, payload?.allow));
    handle('security:get-permissions', () => permissions.list());
    listen('security:revoke', (payload: { origin: unknown; kind?: unknown }) => permissions.revoke(payload?.origin, payload?.kind));

    // --- Privacy
    handle('privacy:get-prefs', () => privacy);
    handle('privacy:set-prefs', (patch: Partial<PrivacyPrefs>) => {
        const next = { ...privacy };
        for (const key of Object.keys(DEFAULT_PRIVACY) as (keyof PrivacyPrefs)[]) {
            if (typeof patch?.[key] === 'boolean') next[key] = patch[key]!;
        }
        privacy = next;
        store.set('privacy', privacy);
        return privacy;
    });
    handle('privacy:clear-data', async (options: { cookies?: boolean; cache?: boolean }) => {
        if (options?.cookies) {
            await browsing.clearStorageData();
            await browsing.clearAuthCache();
            httpFallbackHosts.clear();
            await account.refresh();
        }
        if (options?.cache) {
            await browsing.clearCache();
            await browsing.clearHostResolverCache();
        }
        return true;
    });
    // Called when the last private tab closes: nothing from it survives.
    handle('privacy:clear-incognito', async () => {
        await incognito.clearStorageData();
        await incognito.clearCache();
        await incognito.clearAuthCache();
        permissions.clearEphemeral();
        return true;
    });

    // --- Search suggestions (proxied to avoid CORS; never sends cookies)
    const SUGGEST_ENDPOINTS: Record<string, (q: string) => string> = {
        google: q => `https://suggestqueries.google.com/complete/search?client=chrome&q=${q}`,
        duckduckgo: q => `https://duckduckgo.com/ac/?type=list&q=${q}`,
        bing: q => `https://api.bing.com/osjson.aspx?query=${q}`,
        brave: q => `https://search.brave.com/api/suggest?q=${q}`,
        ecosia: q => `https://ac.ecosia.org/autocomplete?type=list&q=${q}`
    };
    handle('search:suggest', async (query: unknown, engineName: unknown) => {
        if (!privacy.searchSuggestions || typeof query !== 'string' || !query.trim() || query.length > 200) return [];
        const endpoint = SUGGEST_ENDPOINTS[typeof engineName === 'string' ? engineName : 'google'] ?? SUGGEST_ENDPOINTS.google;
        try {
            const res = await session.defaultSession.fetch(endpoint(encodeURIComponent(query)), { credentials: 'omit' });
            const data = await res.json();
            return Array.isArray(data?.[1]) ? data[1].filter((s: unknown) => typeof s === 'string').slice(0, 6) : [];
        } catch {
            return [];
        }
    });

    // --- Extensions (loaded into the browsing session, where tabs live)
    handle('extension:load', async () => {
        if (!mainWindow) return null;
        const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
        if (result.canceled || result.filePaths.length === 0) return null;
        const extension = await browsing.extensions.loadExtension(result.filePaths[0]);
        const saved = store.get<string[]>('extensions', []);
        if (!saved.includes(extension.path)) store.set('extensions', [...saved, extension.path]);
        return { id: extension.id, name: extension.name, version: extension.version };
    });
    handle('extension:list', () => browsing.extensions.getAllExtensions().map(ext => ({ id: ext.id, name: ext.name, version: ext.version })));
    handle('extension:remove', (id: string) => {
        const ext = browsing.extensions.getExtension(id);
        if (ext) store.set('extensions', store.get<string[]>('extensions', []).filter(p => p !== ext.path));
        browsing.extensions.removeExtension(id);
        return true;
    });
    for (const extensionPath of store.get<string[]>('extensions', [])) {
        browsing.extensions.loadExtension(extensionPath).catch(e => console.warn('[Extensions] Failed to restore:', e.message));
    }

    // --- Shell (strictly limited)
    listen('shell:show-item', (filePath: unknown) => {
        if (typeof filePath === 'string' && downloadPaths.has(filePath)) shell.showItemInFolder(filePath);
    });
    handle('shell:open-external', (url: unknown) => {
        if (typeof url === 'string' && /^(https?|mailto):/i.test(url)) return shell.openExternal(url);
    });
    handle('downloads:get-path', () => app.getPath('downloads'));

    // --- UI helpers
    handle('ui:capture-page', async () => {
        if (!mainWindow || mainWindow.isDestroyed()) return null;
        return (await mainWindow.capturePage()).toDataURL();
    });
    listen('window:minimize', () => mainWindow?.minimize());
    listen('window:maximize', () => {
        if (!mainWindow) return;
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    });
    listen('window:close', () => mainWindow?.close());

    // --- Bookmark import
    handle('sync:import-bookmarks', (browser: unknown) => {
        const home = os.homedir();
        const profiles: Record<string, Partial<Record<NodeJS.Platform, string>>> = {
            chrome: {
                darwin: 'Library/Application Support/Google/Chrome/Default/Bookmarks',
                win32: 'AppData/Local/Google/Chrome/User Data/Default/Bookmarks',
                linux: '.config/google-chrome/Default/Bookmarks'
            },
            brave: {
                darwin: 'Library/Application Support/BraveSoftware/Brave-Browser/Default/Bookmarks',
                win32: 'AppData/Local/BraveSoftware/Brave-Browser/User Data/Default/Bookmarks',
                linux: '.config/BraveSoftware/Brave-Browser/Default/Bookmarks'
            },
            edge: {
                darwin: 'Library/Application Support/Microsoft Edge/Default/Bookmarks',
                win32: 'AppData/Local/Microsoft/Edge/User Data/Default/Bookmarks',
                linux: '.config/microsoft-edge/Default/Bookmarks'
            }
        };
        const relative = typeof browser === 'string' ? profiles[browser]?.[process.platform] : undefined;
        if (!relative) return [];
        try {
            const data = JSON.parse(fs.readFileSync(path.join(home, relative), 'utf-8'));
            const bookmarks: { title: string; url: string }[] = [];
            const walk = (node: any) => {
                if (node?.type === 'url' && isWebUrl(node.url)) bookmarks.push({ title: String(node.name ?? ''), url: node.url });
                node?.children?.forEach(walk);
            };
            Object.values(data.roots ?? {}).forEach(walk);
            return bookmarks;
        } catch (e) {
            console.warn(`[Import] ${browser} bookmarks unavailable:`, (e as Error).message);
            return [];
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (!isMac) app.quit();
});

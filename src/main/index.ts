import { app, BrowserWindow, ipcMain, dialog, shell, session, webContents } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { join } from 'path';
import bindings from 'bindings';

const addon = bindings('addon');

// Prevent garbage collection
let mainWindow: BrowserWindow | null = null;

// Privacy & Security Shield Configuration (AdBlocker)
const { ElectronBlocker } = require('@cliqz/adblocker-electron');
const fetch = require('cross-fetch');
let adBlocker: any = null;

// C++ Engine
const engine = new addon.EngineCore();
engine.addBlockPattern('tracker');
engine.addBlockPattern('analytics');


// Network Monitoring State
let isNetworkMonitoringActive = false;

// IPC PERFORMANCE BATCHING
// We queue blocked requests and send them in bursts to prevent freezing the UI thread
// with hundreds of IPC messages per second.
let blockedRequestQueue: any[] = [];
let blockedRequestTimer: NodeJS.Timeout | null = null;

const flushBlockedRequests = () => {
    if (blockedRequestQueue.length === 0) return;
    if (mainWindow && !mainWindow.isDestroyed()) {
        // Send batch
        mainWindow.webContents.send('privacy:tracker-blocked-batch', blockedRequestQueue);
    }
    blockedRequestQueue = [];
    blockedRequestTimer = null;
};

const queueBlockedRequest = (data: any) => {
    blockedRequestQueue.push(data);
    if (!blockedRequestTimer) {
        // Throttle to once every 1 second (1000ms) for smoothness
        blockedRequestTimer = setTimeout(flushBlockedRequests, 1000);
    }
};

// In-memory permission store for this session
const activePermissions: Array<{
    id: number;
    origin: string;
    permission: string;
    status: 'granted' | 'denied';
}> = [];


ipcMain.on('network:toggle-monitoring', (_e, active) => {
    isNetworkMonitoringActive = active;
});

ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker: any) => {
    adBlocker = blocker;
    console.log('[AdBlock] Engine ready');
});

function createWindow() {
    const isMac = process.platform === 'darwin';

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false, // Ensure frameless for better movement control
        backgroundColor: '#0f0f11', // Matches 'underlay-bg'
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webviewTag: true // Enabled for initial prototype
        },
        movable: true,
        enableLargerThanScreen: true, // Allow spanning across dual screens
        titleBarStyle: isMac ? 'hiddenInset' : 'hidden', // Native mac vs generic hidden
        titleBarOverlay: isMac ? false : {
            color: '#0f0f11',
            symbolColor: '#ffffff',
            height: 56 // Matches the h-14 titlebar height
        },
    });

    // Check if we are in development (by checking if vite is serving)
    const isDev = !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // Maximize on startup (Cover screen till notch/menu bar)
    mainWindow.maximize();
    mainWindow.show();

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Lifecycle
// ENFORCE SANDBOX (Chrome-like security)
app.enableSandbox();

// Optimized Process Model
// Force GPU rasterization for performance and separation
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist'); // Ensure GPU process is always used if possible

// RENDERER OPTIMIZATION (LayoutNG, Slimming Paint, OOPIF)
app.commandLine.appendSwitch('enable-blink-features', 'LayoutNG'); // Removed SlimmingPaintV2 as it can cause input issues
app.commandLine.appendSwitch('site-per-process'); // Strict OOPIF
app.commandLine.appendSwitch('enable-features', 'VizDisplayCompositor,OverlayScrollbar');

// JS PERFORMANCE (V8 Tuning)
// Enforce strict optimizations and future features for speed
// app.commandLine.appendSwitch('js-flags', '--sparkplug');
// --sparkplug: fast non-optimizing compiler (baseline)
// --no-lazy: compile everything immediately (tradeoff: startup speed vs execution speed) -> maybe dangerous for startup, let's stick to safer defaults + sparkplug
// improving startup: remove --no-lazy. Keep sparkplug.

// NETWORK OPTIMIZATION (Speed & Modern Protocols)
app.commandLine.appendSwitch('enable-quic'); // Enable HTTP/3 (QUIC)
// Enforce Network Service + DNS Prediction + DoH + Caching Strategies
app.commandLine.appendSwitch('enable-features', 'NetworkService,NetworkServiceInProcess,NetworkPrediction,NoStatePrefetch,BackForwardCache,ThirdPartyStoragePartitioning,PartitionedCookies');

// DNS OPTIMIZATION
app.commandLine.appendSwitch('dns-over-https-mode', 'automatic');
app.commandLine.appendSwitch('dns-over-https-templates', 'https://chrome.cloudflare-dns.com/dns-query');
app.commandLine.appendSwitch('blink-settings', 'dnsPrefetchingEnabled=true');

// WEB STANDARDS (Graphics & Media)
app.commandLine.appendSwitch('enable-unsafe-webgpu'); // Ensure WebGPU is accessible
app.commandLine.appendSwitch('enable-features', 'Vulkan'); // Cross-platform graphics
app.commandLine.appendSwitch('no-verify-widevine-cdm'); // Allow Widevine for development (OTT)

// SMART TAB LIFECYCLE (Memory Compression)
app.commandLine.appendSwitch('enable-features', 'EmptyNormalWorkletsInWorkerThread,SeparateVP9AndImageWorkers,InputPredictorTypeExperiment'); // Removed ResamplingInputEvents
app.commandLine.appendSwitch('enable-gpu-memory-buffer-compositor-resources');
// app.commandLine.appendSwitch('enable-reduce-image-loading-memory-footprint-in-background');

app.whenReady().then(() => {
    // Handle Downloads
    session.defaultSession.on('will-download', (event: any, item: any, webContents: any) => {
        // Prevent default behavior if needed (optional) but generally we want it to download
        // item.setSavePath(...) can be used to set default path

        const downloadId = Date.now().toString(); // Or use a UUID
        const fileName = item.getFilename();
        const url = item.getURL();
        const savePath = item.getSavePath();
        const totalBytes = item.getTotalBytes();

        // Notify Renderer: Start
        if (mainWindow) {
            mainWindow.webContents.send('download:update', {
                id: downloadId,
                filename: fileName,
                path: savePath,
                url: url,
                state: 'progressing',
                receivedBytes: 0,
                totalBytes: totalBytes
            });
        }

        item.on('updated', (event: any, state: any) => {
            if (state === 'interrupted') {
                if (mainWindow) {
                    mainWindow.webContents.send('download:update', {
                        id: downloadId,
                        state: 'interrupted',
                        receivedBytes: item.getReceivedBytes()
                    });
                }
            } else if (state === 'progressing') {

                if (item.isPaused()) {
                    if (mainWindow) {
                        mainWindow.webContents.send('download:update', {
                            id: downloadId,
                            state: 'paused',
                            receivedBytes: item.getReceivedBytes()
                        });
                    }
                } else {
                    if (mainWindow) {
                        mainWindow.webContents.send('download:update', {
                            id: downloadId,
                            state: 'progressing',
                            receivedBytes: item.getReceivedBytes()
                        });
                    }
                }
            }
        });

        item.once('done', (event: any, state: any) => {
            if (mainWindow) {
                mainWindow.webContents.send('download:update', {
                    id: downloadId,
                    filename: fileName,
                    path: savePath,
                    url: url,
                    state: state === 'completed' ? 'completed' : 'cancelled', // state can be 'completed', 'cancelled' or 'interrupted'
                    receivedBytes: item.getReceivedBytes(),
                    totalBytes: item.getTotalBytes()
                });
            }
        });
    });

    // Unified Session Configuration
    const configureSession = (sess: Electron.Session) => {
        // SPOOF USER AGENT (Standard Chrome on Mac)
        // Updated to Chrome 131 to avoid "Browser not supported" on Google Services
        sess.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");

        // Network Request Handler (AdBlock + Monitoring)
        sess.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details: any, callback: any) => {
            // 1. AdBlocking Check
            if (adBlocker) {
                // Check C++ Engine First (Fast Path)
                const engineCheck = engine.checkUrl(details.url);
                if (engineCheck.blocked) {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        queueBlockedRequest({
                            url: details.url,
                            domain: new URL(details.url).hostname,
                            type: 'C++ Engine',
                            timestamp: Date.now()
                        });
                    }
                    callback({ cancel: true });
                    return;
                }

                // Check if this request should be blocked
                const match = adBlocker.match(details);
                // Whitelist Critical Services
                if (details.url.includes('google.com') || details.url.includes('gstatic.com') || details.url.includes('googleapis.com')) {
                    callback({ cancel: false });
                    return;
                }

                if (match.redirect) {
                    callback({ redirectURL: match.redirect.dataUrl });
                    return;
                }
                if (match.match) {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        let type = 'Ad';
                        const url = details.url.toLowerCase();
                        if (url.includes('tracker') || url.includes('analytics') || url.includes('segment')) type = 'Tracker';

                        queueBlockedRequest({
                            url: details.url,
                            domain: new URL(details.url).hostname,
                            type: type,
                            timestamp: Date.now()
                        });
                    }
                    callback({ cancel: true });
                    return;
                }
            }

            // 2. Network Monitoring (Passive)
            if (mainWindow && !mainWindow.isDestroyed() && isNetworkMonitoringActive) {
                if (!details.url.startsWith('devtools://') && !details.url.includes('localhost:5173')) {
                    mainWindow.webContents.send('network:request', {
                        id: details.id,
                        url: details.url,
                        method: details.method,
                        type: details.resourceType,
                        timestamp: Date.now(),
                        webContentsId: details.webContentsId
                    });
                }
            }

            // 3. Allow
            callback({ cancel: false });
        });

        sess.webRequest.onHeadersReceived((details: any, callback: any) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                const cookies = details.responseHeaders['Set-Cookie'] || details.responseHeaders['set-cookie'];
                if (cookies && cookies.length > 0 && details.resourceType !== 'mainFrame') {
                    try {
                        mainWindow.webContents.send('privacy:cookie-detected', {
                            url: details.url,
                            domain: new URL(details.url).hostname,
                            cookies: cookies,
                            block: false
                        });
                    } catch (e) { }
                }
            }
            callback({ responseHeaders: details.responseHeaders });
        });

        sess.webRequest.onCompleted((details: any) => {
            if (mainWindow && !mainWindow.isDestroyed() && isNetworkMonitoringActive) {
                if (!details.url.startsWith('devtools://') && !details.url.includes('localhost:5173')) {
                    mainWindow.webContents.send('network:complete', {
                        id: details.id,
                        statusCode: details.statusCode,
                        timestamp: Date.now(),
                        duration: -1
                    });
                }
            }
        });

        // Permission Handling
        sess.setPermissionRequestHandler((webContents: any, permission: string, callback: any, details: any) => {
            const check = activePermissions.find(p => p.origin === details.requestingUrl && p.permission === permission);
            if (check && check.status === 'granted') {
                return callback(true);
            }

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('security:permission-request', {
                    origin: details.requestingUrl,
                    permission,
                    details
                });
            }

            // For now, auto-allow to prevent breakage until UI is fully wired
            activePermissions.push({ id: Date.now(), origin: details.requestingUrl, permission, status: 'granted' });
            callback(true);
        });
    };

    // Apply to Default Session
    configureSession(session.defaultSession);

    // Apply to all future sessions (including persist:underlay)
    app.on('session-created', (sess) => {
        configureSession(sess);
    });

    ipcMain.handle('security:get-permissions', () => activePermissions);

    ipcMain.on('security:revoke', (_e, { origin, permission }) => {
        const idx = activePermissions.findIndex(p => p.origin === origin && p.permission === permission);
        if (idx !== -1) {
            activePermissions.splice(idx, 1);
        }
    });

    // CDP Integration
    app.on('web-contents-created', (_e, contents) => {
        if (contents.getType() === 'webview') {
            // Allow Popups from Webview (Important for Google/Reddit Auth)
            contents.setWindowOpenHandler(({ url }) => {
                console.log("[WebView] Requesting popup:", url);
                return {
                    action: 'allow',
                    overrideBrowserWindowOptions: {
                        frame: true,
                        autoHideMenuBar: true,
                        backgroundColor: '#0f0f11',
                        modal: false,
                        focusable: true,
                        alwaysOnTop: true, // Temporarily force on top to fail-safe visibility
                    }
                };
            });

            // Context Menu Integration
            contents.on('context-menu', (_e, params) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('ui:context-menu', {
                        x: params.x,
                        y: params.y,
                        selectionText: params.selectionText,
                        mediaType: params.mediaType,
                        srcUrl: params.srcURL,
                        linkUrl: params.linkURL
                    });
                }
            });

            // Detach on destroy
            contents.once('destroyed', () => {
                try {
                    if (contents.debugger.isAttached()) contents.debugger.detach();
                } catch (e) { }
            });
        }

        // POPUP CONFIGURATION (Google Login Fix)
        if (contents.getType() === 'window') {
            contents.setWindowOpenHandler(({ url }) => {
                return { action: 'allow' };
            });

            // Ensure the popup has proper web preferences for interaction
            contents.once('did-create-window', (window) => {
                // Reset any weird flags
                window.setMenuBarVisibility(false);

                // CRITICAL: Google Sign In needs the correct User Agent on the Popup too!
                // It often defaults to Electron/X.Y.Z which Google blocks.
                window.webContents.setUserAgent(session.defaultSession.getUserAgent());

                // Ensure focus
                window.once('ready-to-show', () => {
                    window.show();
                    window.focus();
                });
            });
        }
    });

    // Developer Mode Tools
    ipcMain.handle('devtools:get-dom', async (_e) => {
        // Fetch top level DOM for the active webview
        // Simplified: just picking the first webview for now or active one would need to be tracked.
        const all = webContents.getAllWebContents();
        const wc = all.find((w: any) => w.getType() === 'webview' && !w.isDestroyed() && w.debugger.isAttached());
        if (wc) {
            try {
                const { root } = await wc.debugger.sendCommand('DOM.getDocument', { depth: 2, pierce: true });
                return root;
            } catch (e) {
                console.error('DOM fetch failed', e);
                return null;
            }
        }
        return null;
    });

    ipcMain.on('devtools:toggle-fps', (_e, show) => {
        const all = webContents.getAllWebContents();
        for (const wc of all) {
            if (wc.getType() === 'webview' && wc.debugger.isAttached()) {
                wc.debugger.sendCommand('Overlay.setShowFPSCounter', { show }).catch(() => { });
            }
        }
    });

    ipcMain.on('devtools:toggle-paint-rects', (_e, show) => {
        const all = webContents.getAllWebContents();
        for (const wc of all) {
            if (wc.getType() === 'webview' && wc.debugger.isAttached()) {
                wc.debugger.sendCommand('Overlay.setShowPaintRects', { result: show }).catch(() => { });
            }
        }
    });

    // Privacy Reporting (Fingerprinting)
    ipcMain.on('privacy:fingerprint-report', (_e, data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('privacy:fingerprint-attempt', {
                ...data,
                timestamp: Date.now()
            });
        }
    });

    // Extension Management
    ipcMain.handle('extension:load', async (_e) => {
        try {
            const { dialog } = require('electron');
            const result = await dialog.showOpenDialog(mainWindow!, {
                properties: ['openDirectory']
            });

            if (result.canceled || result.filePaths.length === 0) return null;

            const extensionPath = result.filePaths[0];
            const extension = await session.defaultSession.loadExtension(extensionPath);
            return { id: extension.id, name: extension.name, version: extension.version };
        } catch (e: any) {
            console.error('Failed to load extension:', e);
            throw e;
        }
    });

    ipcMain.handle('extension:list', async () => {
        return session.defaultSession.getAllExtensions().map((ext: Electron.Extension) => ({
            id: ext.id,
            name: ext.name,
            version: ext.version
        }));
    });

    // Search Suggestions (Proxy to bypass CORS)
    ipcMain.handle('search:suggest', async (_e, query) => {
        try {
            const response = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            return data;
        } catch (e) {
            console.error('Search suggest failed:', e);
            return [];
        }
    });

    ipcMain.handle('extension:remove', async (_e, id) => {
        session.defaultSession.removeExtension(id);
        return true;
        ipcMain.on('shell:show-item', (_e, path) => {
            shell.showItemInFolder(path);
        });

    });

    // Sync / Import Handlers
    ipcMain.handle('sync:import-bookmarks', async (_e, browser: 'chrome' | 'brave' | 'edge') => {
        try {
            const homeDir = os.homedir();
            let bookmarksPath = '';

            switch (browser) {
                case 'chrome':
                    bookmarksPath = path.join(homeDir, 'Library/Application Support/Google/Chrome/Default/Bookmarks');
                    break;
                case 'brave':
                    bookmarksPath = path.join(homeDir, 'Library/Application Support/BraveSoftware/Brave-Browser/Default/Bookmarks');
                    break;
                case 'edge':
                    bookmarksPath = path.join(homeDir, 'Library/Application Support/Microsoft Edge/Default/Bookmarks');
                    break;
                default:
                    return [];
            }

            if (!fs.existsSync(bookmarksPath)) {
                console.warn(`${browser} bookmarks file not found at:`, bookmarksPath);
                return [];
            }

            const content = fs.readFileSync(bookmarksPath, 'utf-8');
            const data = JSON.parse(content);
            const bookmarks: { title: string, url: string }[] = [];

            const traverse = (node: any) => {
                if (node.type === 'url') {
                    bookmarks.push({ title: node.name, url: node.url });
                } else if (node.children) {
                    node.children.forEach(traverse);
                }
            };

            if (data.roots) {
                Object.values(data.roots).forEach((root: any) => traverse(root));
            }

            return bookmarks;
        } catch (e) {
            console.error(`Failed to import ${browser} bookmarks:`, e);
            return [];
        }
    });

    // Create window when app is ready
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });

    // C++ Integration
    ipcMain.handle('get-cpp-message', () => {
        try {
            return addon.getMessage();
        } catch (e) {
            console.error('C++ Addon Error:', e);
            return 'Error calling C++ addon';
        }
    });
});

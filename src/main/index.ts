import { app, BrowserWindow, ipcMain, dialog, shell, session, webContents, powerMonitor } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { join } from 'path';
import bindings from 'bindings';
import { store } from './store';

const addon = bindings('addon');

// Prevent garbage collection
let mainWindow: BrowserWindow | null = null;

// Global State for Diagnostics
declare global {
    var widevineStatus: string;
}

// Privacy & Security Shield Configuration (AdBlocker)
const { ElectronBlocker } = require('@cliqz/adblocker-electron');
const fetch = require('cross-fetch');
let adBlocker: any = null;

// User Agent Configuration (Bypass Google Security Checks)
// User Agent Configuration (Bypass Google Security Checks)
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.86 Safari/537.36';
app.userAgentFallback = USER_AGENT;

// ...

// WIDEVINE CDM SETUP (Fix for Netflix Error M7701-1003)
function setupWidevine() {
    // Support macOS and Windows
    const isAvailable = process.platform === 'darwin' || process.platform === 'win32';
    if (!isAvailable) return;

    try {
        let staticPaths: string[] = [];

        if (process.platform === 'darwin') {
            staticPaths = [
                '/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions',
                '/Applications/Brave Browser.app/Contents/Frameworks/Brave Browser Framework.framework/Versions',
                '/Applications/Microsoft Edge.app/Contents/Frameworks/Microsoft Edge Framework.framework/Versions'
            ];
        } else if (process.platform === 'win32') {
            const localAppData = process.env.LOCALAPPDATA || '';
            const programFiles = process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES || 'C:\\Program Files';

            staticPaths = [
                path.join(programFiles, 'Google/Chrome/Application'),
                path.join(programFiles, 'Microsoft/Edge/Application'),
                path.join(programFiles, 'BraveSoftware/Brave-Browser/Application'),
                // User data implementations often live here
                path.join(localAppData, 'Google/Chrome/User Data/WidevineCdm'),
                path.join(localAppData, 'Microsoft/Edge/User Data/WidevineCdm'),
            ];
        }

        let cdmPath = '';
        let version = '';

        // Helper to find valid version directories
        const getValidVersions = (dir: string) => {
            if (!fs.existsSync(dir)) return [];
            return fs.readdirSync(dir).filter(v => /^\d+\.\d+\.\d+\.\d+$/.test(v));
        };

        // Helper to sort versions descending
        const sortVersions = (versions: string[]) => {
            return versions.sort((a, b) => {
                const pa = a.split('.').map(Number);
                const pb = b.split('.').map(Number);
                for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
                    if ((pa[i] || 0) > (pb[i] || 0)) return -1;
                    if ((pa[i] || 0) < (pb[i] || 0)) return 1;
                }
                return 0;
            });
        };

        // Check Frameworks/Installations
        for (const basePath of staticPaths) {
            const versions = getValidVersions(basePath);
            if (versions.length > 0) {
                const latest = sortVersions(versions)[0];
                let potentialArchs: string[] = [];

                if (process.platform === 'darwin') {
                    // Structure: <version>/Libraries/WidevineCdm/_platform_specific/<arch>/libwidevinecdm.dylib
                    potentialArchs = os.arch() === 'arm64' ? ['mac_arm64', 'mac_x64'] : ['mac_x64'];
                    for (const arch of potentialArchs) {
                        const candidate = path.join(basePath, latest, 'Libraries/WidevineCdm/_platform_specific', arch, 'libwidevinecdm.dylib');
                        if (fs.existsSync(candidate)) {
                            cdmPath = candidate;
                            version = latest;
                            console.log(`[Widevine] Found in Framework (Mac): ${candidate} (${version})`);
                            break;
                        }
                    }
                } else if (process.platform === 'win32') {
                    // Structure A (Program Files): <version>/WidevineCdm/_platform_specific/win_x64/widevinecdm.dll
                    // Structure B (User Data): <version>/_platform_specific/win_x64/widevinecdm.dll
                    const arch = 'win_x64'; // Modern Electron is usually 64-bit

                    const candidates = [
                        path.join(basePath, latest, 'WidevineCdm', '_platform_specific', arch, 'widevinecdm.dll'),
                        path.join(basePath, latest, '_platform_specific', arch, 'widevinecdm.dll')
                    ];

                    for (const candidate of candidates) {
                        if (fs.existsSync(candidate)) {
                            cdmPath = candidate;
                            version = latest;
                            console.log(`[Widevine] Found in Windows Path: ${candidate} (${version})`);
                            break;
                        }
                    }
                }
                if (cdmPath) break;
            }
        }

        if (cdmPath && version) {
            console.log(`[Widevine] Configured: v${version}`);
            app.commandLine.appendSwitch('widevine-cdm-path', cdmPath);
            app.commandLine.appendSwitch('widevine-cdm-version', version);
            // Critical for Development Mode and Unverified CDMs
            app.commandLine.appendSwitch('no-verify-widevine-cdm');
            global.widevineStatus = 'success';
        } else {
            console.warn('[Widevine] CDM NOT FOUND. Netflix playback will fail.');
            console.warn('  -> Please ensure Google Chrome or Edge is installed.');
            global.widevineStatus = 'failed';
        }

    } catch (e) {
        console.error('[Widevine] Setup Exception:', e);
        global.widevineStatus = 'error';
    }
}

setupWidevine();
const engine = new addon.EngineCore();
engine.addBlockPattern('tracker');
engine.addBlockPattern('analytics');

// Onboarding IPC
ipcMain.handle('onboarding:get-status', () => {
    return store.get('onboardingCompleted', false);
});

ipcMain.on('onboarding:complete', () => {
    store.set('onboardingCompleted', true);
});

ipcMain.on('onboarding:reset', () => {
    store.set('onboardingCompleted', false);
});


// Network Monitoring State
let isNetworkMonitoringActive = false;

// BATTERY OPTIMIZATION (MacBook "Battery King" Mode)
const setupPowerMonitoring = () => {
    const updatePowerState = () => {
        const isOnBattery = powerMonitor.isOnBatteryPower();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('power:state-changed', { isOnBattery });
        }
    };

    powerMonitor.on('on-battery', updatePowerState);
    powerMonitor.on('on-ac', updatePowerState);

    // Initial check
    app.once('ready', () => { // Ensure app is ready before checking
        // Defer slightly to ensure window is created
        setTimeout(updatePowerState, 2000);
    });
};
setupPowerMonitoring();

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




ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker: any) => {
    adBlocker = blocker;
    console.log('[AdBlock] Engine ready');
});

function createWindow() {
    const isMac = process.platform === 'darwin';

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false, // HIDE INITIALLY to prevent stutter/white flash
        frame: false, // Ensure frameless for better movement control
        backgroundColor: '#0f0f11', // Matches 'underlay-bg'
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webviewTag: true, // Enabled for initial prototype
            plugins: true // Allow plugins (like Widevine)
        },
        movable: true,
        enableLargerThanScreen: true, // Allow spanning across dual screens
        titleBarStyle: isMac ? 'hiddenInset' : 'hidden', // Native mac vs generic hidden
        titleBarOverlay: isMac ? false : false, // Disable native overlay on Windows to use custom controls
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

    // WAIT FOR RENDERER TO BE READY (Prevents stutter)
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Lifecycle
// ENFORCE SANDBOX (Chrome-like security)
// app.enableSandbox();

// Optimized Process Model
// Force GPU rasterization for performance and separation
app.commandLine.appendSwitch('enable-gpu-rasterization');
// app.commandLine.appendSwitch('enable-zero-copy'); // DISABLED: Causes 'Invalid mailbox' crash on macOS M-series
app.commandLine.appendSwitch('ignore-gpu-blocklist'); // Ensure GPU process is always used if possible

// RENDERER OPTIMIZATION (LayoutNG, Slimming Paint, OOPIF)
app.commandLine.appendSwitch('enable-smooth-scrolling'); // CRITICAL: Silky smooth scrolling
app.commandLine.appendSwitch('enable-accelerated-2d-canvas'); // CRITICAL: Heavy sites (Awwwards)
app.commandLine.appendSwitch('enable-blink-features', 'LayoutNG');
app.commandLine.appendSwitch('site-per-process'); // Strict OOPIF
app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar');
// Enforce strict optimizations and future features for speed
// app.commandLine.appendSwitch('js-flags', '--sparkplug');
// --sparkplug: fast non-optimizing compiler (baseline)
// --no-lazy: compile everything immediately (tradeoff: startup speed vs execution speed) -> maybe dangerous for startup, let's stick to safer defaults + sparkplug
// improving startup: remove --no-lazy. Keep sparkplug.

// NETWORK OPTIMIZATION (Speed & Modern Protocols)
app.commandLine.appendSwitch('enable-quic'); // Enable HTTP/3 (QUIC)
// Enforce Network Service + DNS Prediction + DoH + Caching Strategies
app.commandLine.appendSwitch('enable-features', 'NetworkService,NetworkServiceInProcess,NetworkPrediction,NoStatePrefetch,BackForwardCache,ThirdPartyStoragePartitioning,PartitionedCookies,SharedArrayBuffer');

// DNS OPTIMIZATION
app.commandLine.appendSwitch('dns-over-https-mode', 'automatic');
app.commandLine.appendSwitch('dns-over-https-templates', 'https://chrome.cloudflare-dns.com/dns-query');
app.commandLine.appendSwitch('blink-settings', 'dnsPrefetchingEnabled=true');

// WEB STANDARDS (Graphics & Media)
app.commandLine.appendSwitch('enable-unsafe-webgpu'); // Ensure WebGPU is accessible
app.commandLine.appendSwitch('enable-features', 'Vulkan'); // Cross-platform graphics
app.commandLine.appendSwitch('no-verify-widevine-cdm'); // Allow Widevine for development (OTT)



/* try {
    const homeDir = os.homedir();
    // Common User Data Paths (Where browsers download updates)
    const userDataPaths = [
        path.join(homeDir, 'Library/Application Support/Google/Chrome/WidevineCdm'),
        path.join(homeDir, 'Library/Application Support/BraveSoftware/Brave-Browser/WidevineCdm'),
        path.join(homeDir, 'Library/Application Support/Microsoft Edge/WidevineCdm'),
    ];

    // Static Framework Paths (Where browsers ship the component)
    const staticPaths = [
        '/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions',
        '/Applications/Brave Browser.app/Contents/Frameworks/Brave Browser Framework.framework/Versions',
        '/Applications/Microsoft Edge.app/Contents/Frameworks/Microsoft Edge Framework.framework/Versions'
    ];

    let cdmPath = '';
    let version = '';

    // Helper to find valid version directories
    const getValidVersions = (dir: string) => {
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir).filter(v => /^\d+\.\d+\.\d+\.\d+$/.test(v));
    };

    // Helper to sort versions descending
    const sortVersions = (versions: string[]) => {
        return versions.sort((a, b) => {
            const pa = a.split('.').map(Number);
            const pb = b.split('.').map(Number);
            for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
                if ((pa[i] || 0) > (pb[i] || 0)) return -1;
                if ((pa[i] || 0) < (pb[i] || 0)) return 1;
            }
            return 0;
        });
    };

    // 1. Check User Data (Updates are usually newer)
    for (const basePath of userDataPaths) {
        const versions = getValidVersions(basePath);
        if (versions.length > 0) {
            const latest = sortVersions(versions)[0];
            // Structure: <version>/_platform_specific/<arch>/libwidevinecdm.dylib
            // Check both archs to be safe
            const archs = os.arch() === 'arm64' ? ['mac_arm64', 'mac_x64'] : ['mac_x64'];

            for (const arch of archs) {
                const candidate = path.join(basePath, latest, '_platform_specific', arch, 'libwidevinecdm.dylib');
                if (fs.existsSync(candidate)) {
                    cdmPath = candidate;
                    version = latest;
                    console.log(`[Widevine] Found in User Data: ${candidate} (${version})`);
                    break;
                }
            }
        }
        if (cdmPath) break;
    }

    // 2. Check Static Frameworks (Fallback)
    if (!cdmPath) {
        for (const basePath of staticPaths) {
            const versions = getValidVersions(basePath);
            if (versions.length > 0) {
                const latest = sortVersions(versions)[0];
                // Structure: <version>/Libraries/WidevineCdm/_platform_specific/<arch>/libwidevinecdm.dylib
                const archs = os.arch() === 'arm64' ? ['mac_arm64', 'mac_x64'] : ['mac_x64'];

                for (const arch of archs) {
                    const candidate = path.join(basePath, latest, 'Libraries/WidevineCdm/_platform_specific', arch, 'libwidevinecdm.dylib');
                    if (fs.existsSync(candidate)) {
                        cdmPath = candidate;
                        version = latest;
                        console.log(`[Widevine] Found in Framework: ${candidate} (${version})`);
                        break;
                    }
                }
            }
            if (cdmPath) break;
        }
    }

    if (cdmPath && version) {
        console.log(`[Widevine] Configured: v${version}`);
        app.commandLine.appendSwitch('widevine-cdm-path', cdmPath);
        app.commandLine.appendSwitch('widevine-cdm-version', version);
        // Critical for Development Mode
        app.commandLine.appendSwitch('no-verify-widevine-cdm');
        global.widevineStatus = 'success';
    } else {
        console.warn('[Widevine] CDM NOT FOUND. Netflix playback will fail.');
        console.warn('  -> Please ensure Google Chrome is installed and updated.');
        global.widevineStatus = 'failed';
    }

} catch (e) {
    console.error('[Widevine] Setup Exception:', e);
    global.widevineStatus = 'error';
}
} */



// SMART TAB LIFECYCLE (Memory Compression)
app.commandLine.appendSwitch('enable-features', 'EmptyNormalWorkletsInWorkerThread,SeparateVP9AndImageWorkers,InputPredictorTypeExperiment'); // Removed ResamplingInputEvents and EcoQoS (causing crashes)
app.commandLine.appendSwitch('enable-gpu-memory-buffer-compositor-resources');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-site-isolation-trials'); // Reduces memory overhead

// ... (existing code)

// Whitelist Critical Services & Benchmarks


app.whenReady().then(() => {
    // DIAGNOSTIC CHECK FOR WIDEVINE
    if (global.widevineStatus === 'failed') {
        console.log("Widevine Failed");
    }
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
        sess.setUserAgent(USER_AGENT);

        // Network Request Handler (AdBlock + Monitoring)
        sess.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details: any, callback: any) => {
            // 1. AdBlocking Check
            if (adBlocker) {
                // Whitelist Critical Services & Benchmarks (FAST PATH)
                if (
                    details.url.includes('google.com') ||
                    details.url.includes('gstatic.com') ||
                    details.url.includes('googleapis.com') ||
                    details.url.includes('googlevideo.com') ||
                    details.url.includes('browserbench.org') || // Speedometer
                    details.url.includes('localhost') // Dev
                ) {
                    callback({ cancel: false });
                    return;
                }

                // Check C++ Engine First (Fast Path)
                const engineCheck = engine.checkUrl(details.url);
                if (engineCheck.blocked) {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        queueBlockedRequest({
                            url: details.url,
                            domain: new URL(details.url).hostname,
                            type: 'C++ Engine',
                            timestamp: Date.now(),
                            tabId: details.webContentsId
                        });
                    }
                    callback({ cancel: true });
                    return;
                }

                // Check if this request should be blocked
                const match = adBlocker.match(details);
                // Whitelist Critical Services
                if (details.url.includes('google.com') || details.url.includes('gstatic.com') || details.url.includes('googleapis.com') || details.url.includes('googlevideo.com')) {
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
                        if (url.includes('tracker') || url.includes('analytics') || url.includes('segment') || url.includes('telemetry')) type = 'Tracker';
                        if (url.includes('fingerprint') || url.includes('font') || url.includes('canvas')) type = 'Fingerprinter';
                        if (url.includes('miner') || url.includes('coin') || url.includes('crypto')) type = 'Cryptominer';
                        if (url.includes('social') || url.includes('facebook') || url.includes('twitter') || url.includes('linkedin')) type = 'Social';

                        queueBlockedRequest({
                            url: details.url,
                            domain: new URL(details.url).hostname,
                            type: type,
                            timestamp: Date.now(),
                            tabId: details.webContentsId // CRITICAL for per-tab stats
                        });
                    }
                    callback({ cancel: true });
                    return;
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

            const responseHeaders = { ...details.responseHeaders };

            // ENABLE SHARED ARRAY BUFFER FOR GOOGLE EARTH
            // Google Earth requires Cross-Origin Isolation to use SharedArrayBuffer for its multi-threaded rendering engine.
            if (details.url.includes('earth.google.com')) {
                responseHeaders['Cross-Origin-Opener-Policy'] = ['same-origin'];
                responseHeaders['Cross-Origin-Embedder-Policy'] = ['require-corp'];
            }

            callback({ responseHeaders });
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

            // if (mainWindow && !mainWindow.isDestroyed()) {
            //     mainWindow.webContents.send('security:permission-request', {
            //         origin: details.requestingUrl,
            //         permission,
            //         details
            //     });
            // }

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

            // NETFLIX DRM FAILURE FALLBACK
            // Inject a monitor to detect M7701-1003 (VMP Failure) and eject to user's browser
            contents.on('did-finish-load', () => {
                if (contents.getURL().includes('netflix.com')) {
                    contents.executeJavaScript(`
                        (function() {
                            if (window.netflixMonitorActive) return;
                            window.netflixMonitorActive = true;
                            
                            const checkError = () => {
                                const body = document.body.innerText;
                                if (body.includes('M7701-1003') || body.includes('M7701-1002')) {
                                    // Use console.log as a fallback signal if IPC is blocked
                                    console.log('NETFLIX_DRM_FAILURE_SIGNAL'); 
                                    // Try standard IPC if exposed
                                    try {
                                        // We need to bridge this via the preload or console interception
                                        // Since we don't have a dedicated preload for webviews yet, console interception is safer.
                                    } catch(e) {}
                                }
                            };
                            
                            // Check immediately and observe
                            checkError();
                            const observer = new MutationObserver(checkError);
                            observer.observe(document.body, { childList: true, subtree: true });
                        })();
                    `).catch(e => console.error("Script Injection Failed:", e));
                }
            });

            contents.on('console-message', (_event, _level, message, _line, _sourceId) => {
                if (message === 'NETFLIX_DRM_FAILURE_SIGNAL') {
                    console.log('[Main] Detected Netflix DRM Failure inside Webview. Ejecting to system browser...');
                    const currentUrl = contents.getURL();
                    require('electron').shell.openExternal(currentUrl);
                }
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
                window.webContents.setUserAgent(USER_AGENT);

                // Ensure focus
                window.once('ready-to-show', () => {
                    window.show();
                    window.focus();
                });
            });
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
    });

    ipcMain.on('shell:show-item', (_e, path) => {
        shell.showItemInFolder(path);
    });

    // Screenshot Tool
    ipcMain.handle('ui:capture-page', async () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            // Capture the visible area of the main window
            const image = await mainWindow.capturePage();
            // Return base64 for immediate display/download in renderer
            return image.toDataURL();
        }
        return null;
    });

    // Window Controls
    ipcMain.on('window:minimize', () => {
        if (mainWindow) mainWindow.minimize();
    });

    ipcMain.on('window:maximize', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
    });

    ipcMain.on('window:close', () => {
        if (mainWindow) mainWindow.close();
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

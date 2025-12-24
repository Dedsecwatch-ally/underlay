import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';

// Prevent garbage collection
let mainWindow: BrowserWindow | null = null;

function createWindow() {
    const isMac = process.platform === 'darwin';

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#0f0f11', // Matches 'underlay-bg'
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webviewTag: true // Enabled for initial prototype
        },
        titleBarStyle: isMac ? 'hiddenInset' : 'hidden', // Native mac vs generic hidden
        titleBarOverlay: isMac ? false : {
            color: '#0f0f11',
            symbolColor: '#ffffff',
            height: 40 // Matches the h-10 titlebar height
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

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App lifecycle
app.whenReady().then(() => {
    createWindow();

    const { session, webContents } = require('electron');

    // Privacy & Security Shield Configuration
    let isPrivacyShieldActive = true;

    // Comprehensive "Hacker" Blocklist
    const BLOCKLIST = {
        ads: [
            'doubleclick.net', 'adservice.google.com', 'googlesyndication.com', 'googleads.g.doubleclick.net',
            'pubads.g.doubleclick.net', 'adnxs.com', 'criteo.com', 'rubiconproject.com', 'openx.net',
            'ads-twitter.com', 'amazon-adsystem.com', 'facebook.com/tr/', 'bingads.microsoft.com',
            'taboola.com', 'outbrain.com', 'adroll.com', 'ads.yahoo.com', 'moatads.com'
        ],
        trackers: [
            'google-analytics.com', 'googletagmanager.com', 'facebook.net', 'connect.facebook.net',
            'hotjar.com', 'segment.io', 'newrelic.com', 'mixpanel.com', 'crazyegg.com', 'bugsnag.com',
            'sentry.io', 'clarity.ms', 'fullstory.com', 'optimizely.com', 'tealium.com'
        ],
        miners: [
            'coinhive.com', 'coin-hive.com', 'jsecoin.com', 'miner.js', 'cryptoloot.pro',
            'webminepool.com', 'deepminer.org', 'coinimp.com', 'minr.pw'
        ],
        youtube: [
            'youtube.com/pagead', 'youtube.com/ptracking', 'youtube.com/api/stats/ads',
            'youtube.com/api/stats/qoe', 'youtube.com/youtubei/v1/log_event',
            'googleads.g.doubleclick.net/pagead/id', 'static.doubleclick.net', 'google.com/pagead'
        ]
    };

    // Flatten for quick lookup
    const ALL_BLOCK_PATTERNS = [...BLOCKLIST.ads, ...BLOCKLIST.trackers, ...BLOCKLIST.miners, ...BLOCKLIST.youtube];

    // Pop-up Blocking Logic
    if (mainWindow) {
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (url.startsWith('about:blank')) return { action: 'allow' }; // Allow internal

            // Basic pop-up heuristic: If it's not a direct user navigation (difficult to detect purely here, but we can filter aggressively)
            // For this "Privacy Browser", we default to blocking popups unless we explicitly allow specific flows.
            console.log(`[Popup Blocked] ${url}`);

            // Notify UI of blocked popup
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('privacy:popup-blocked', {
                    url,
                    timestamp: Date.now()
                });
            }

            return { action: 'deny' };
        });
    }

    // Network Monitoring & Privacy Shield
    session.defaultSession.webRequest.onBeforeRequest((details: any, callback: any) => {
        if (mainWindow && !mainWindow.isDestroyed()) {

            // 1. Ad & Threat Blocking
            if (isPrivacyShieldActive) {
                const url = details.url.toLowerCase();
                const matchedRule = ALL_BLOCK_PATTERNS.find(pattern => url.includes(pattern));

                if (matchedRule) {
                    // console.log(`[Shield Active] Blocked: ${url}`);

                    // Categorize the block for the UI
                    let type = 'Ad';
                    if (BLOCKLIST.trackers.some(p => url.includes(p))) type = 'Tracker';
                    else if (BLOCKLIST.miners.some(p => url.includes(p))) type = 'Miner';
                    else if (BLOCKLIST.youtube.some(p => url.includes(p))) type = 'YouTube Ad';

                    mainWindow.webContents.send('privacy:tracker-blocked', {
                        url: details.url,
                        domain: new URL(details.url).hostname,
                        type: type, // New field for UI
                        timestamp: Date.now()
                    });

                    return callback({ cancel: true });
                }
            }

            // 2. Logging for Network Graph
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
        callback({});
    });

    session.defaultSession.webRequest.onHeadersReceived((details: any, callback: any) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            // 3rd Party Cookie Detection
            const cookies = details.responseHeaders['Set-Cookie'] || details.responseHeaders['set-cookie'];
            if (cookies && cookies.length > 0) {
                try {
                    const requestDomain = new URL(details.url).hostname;
                    // initiator might be missing or complex, simplistic check:
                    // If requestDomain is different from the main frame URL (we don't easily know main frame URL locally here without lookup)
                    // For prototype, we'll just emit everything and filter in UI? 
                    // Better: check if not main_frame resource type
                    if (details.resourceType !== 'mainFrame') {
                        // It's likely a subresource setting a cookie -> potentially 3rd party
                        mainWindow.webContents.send('privacy:cookie-detected', {
                            url: details.url,
                            domain: requestDomain,
                            cookies: cookies,
                            block: false // We are not blocking cookies yet, just visualizing
                        });
                    }
                } catch (e) { }
            }
        }
        callback({ responseHeaders: details.responseHeaders });
    });

    session.defaultSession.webRequest.onCompleted((details: any) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
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

    // Download Management
    session.defaultSession.on('will-download', (_event: any, item: any, _webContents: any) => {
        if (!mainWindow || mainWindow.isDestroyed()) return;

        const id = Date.now().toString(); // Simple ID
        const filename = item.getFilename();
        const url = item.getURL();

        // 1. Start
        mainWindow.webContents.send('download:update', {
            id,
            filename,
            url,
            state: 'progressing',
            receivedBytes: 0,
            totalBytes: item.getTotalBytes()
        });

        item.on('updated', (_event: any, state: any) => {
            if (!mainWindow || mainWindow.isDestroyed()) return;
            if (state === 'interrupted') {
                mainWindow.webContents.send('download:update', { id, state: 'interrupted' });
            } else if (state === 'progressing') {
                if (item.isPaused()) {
                    mainWindow.webContents.send('download:update', { id, state: 'paused' });
                } else {
                    mainWindow.webContents.send('download:update', {
                        id,
                        state: 'progressing',
                        receivedBytes: item.getReceivedBytes(),
                        totalBytes: item.getTotalBytes()
                    });
                }
            }
        });

        item.once('done', (_event: any, state: any) => {
            if (!mainWindow || mainWindow.isDestroyed()) return;
            if (state === 'completed') {
                mainWindow.webContents.send('download:update', {
                    id,
                    state: 'completed',
                    receivedBytes: item.getReceivedBytes(), // Should equal total
                    totalBytes: item.getTotalBytes()
                });
            } else {
                mainWindow.webContents.send('download:update', { id, state: 'failed' }); // cancelled or interrupted
            }
        });
    });

    // Performance Monitoring - Optimized Polling
    // Store latest CDP metrics per WebContents ID
    const cdpMetrics: Record<number, any> = {};
    let perfInterval: NodeJS.Timeout | null = null;

    const startPerfPolling = () => {
        if (perfInterval) return;
        perfInterval = setInterval(async () => {
            if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
                const metrics = app.getAppMetrics();
                const allWebContents = webContents.getAllWebContents();

                // Only poll webviews that are likely active or important
                // For a lighter browser, we skip extreme detailed CDP polling on every interval
                // unless the user specifically has the "Performance" overlay open (which we don't track explicitly yet)
                // We'll reduce the scope: only poll basic process metrics usually.

                const processMap = allWebContents.map((wc: any) => ({
                    id: wc.id,
                    pid: wc.getOSProcessId(),
                    type: wc.getType(),
                    url: wc.getURL(),
                    cdp: cdpMetrics[wc.id] // Cached or empty
                }));

                mainWindow.webContents.send('performance:update', {
                    metrics,
                    processMap
                });
            }
        }, 5000);
    };

    const stopPerfPolling = () => {
        if (perfInterval) {
            clearInterval(perfInterval);
            perfInterval = null;
        }
    };

    startPerfPolling();

    // Optimize background resource usage
    if (mainWindow) {
        mainWindow.on('blur', () => {
            // Optional: throttle polling further or stop
        });

        mainWindow.on('focus', () => {
            startPerfPolling();
        });

        mainWindow.on('hide', stopPerfPolling);
        mainWindow.on('show', startPerfPolling);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // CDP Integration
    app.on('web-contents-created', (_e, contents) => {
        if (contents.getType() === 'webview') {
            contents.on('did-start-navigation', () => {
                try {
                    if (!contents.debugger.isAttached()) {
                        contents.debugger.attach('1.3');
                        contents.debugger.sendCommand('Network.enable');
                        contents.debugger.sendCommand('Security.enable');
                        contents.debugger.sendCommand('DOM.enable');
                        contents.debugger.sendCommand('Overlay.enable');
                        contents.debugger.sendCommand('Profiler.enable');
                    }
                } catch (err) {
                    console.error('Debugger attach failed', err);
                }
            });

            // YOUTUBE AD BLOCKING INJECTION
            contents.on('dom-ready', () => {
                const url = contents.getURL();
                if (url.includes('youtube.com')) {
                    // 1. Cosmetic Filtering (Hide Ad Elements)
                    contents.insertCSS(`
                        .video-ads, .ytp-ad-module, .ytp-ad-image-overlay,
                        .ytp-ad-overlay-container, #player-ads, #masthead-ad,
                        ytd-ad-slot-renderer, ytd-rich-item-renderer:has(> .ytd-ad-slot-renderer),
                        .ytd-ad-slot-renderer, .ytd-in-feed-ad-layout-renderer,
                        .ad-showing .html5-video-controls {
                            display: none !important;
                            visibility: hidden !important;
                            width: 0 !important;
                            height: 0 !important;
                            pointer-events: none !important;
                        }
                    `);

                    // 2. Behavioral Blocking (Aggressive Skip)
                    contents.executeJavaScript(`
                        (() => {
                            if (window._adBlockerRunning) return;
                            window._adBlockerRunning = true;
                            console.log('[Privacy] YouTube Ad Blocker Active');

                            const skipAd = () => {
                                const video = document.querySelector('video');
                                const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .videoAdUiSkipButton');
                                const overlayClose = document.querySelector('.ytp-ad-overlay-close-button');
                                
                                // Click Skip Button
                                if (skipBtn) {
                                    skipBtn.click();
                                    console.log('[Privacy] Skipped ad button');
                                }
                                
                                // Close Overlay
                                if (overlayClose) {
                                    overlayClose.click();
                                }

                                // Fast Forward Video Ads
                                if (video) {
                                    const isAd = document.querySelector('.ad-showing') || document.querySelector('.ad-interrupting');
                                    if (isAd) {
                                        video.playbackRate = 16.0;
                                        video.muted = true;
                                        if (isFinite(video.duration)) {
                                            video.currentTime = video.duration;
                                        }
                                        console.log('[Privacy] Fast-forwarded ad');
                                    }
                                }
                            };

                            // Run on interval as fallback
                            setInterval(skipAd, 100);

                            // Run on mutation for instant reaction
                            const observer = new MutationObserver((mutations) => {
                                for (const m of mutations) {
                                    if (m.type === 'childList' || m.type === 'attributes') {
                                        skipAd();
                                    }
                                }
                            });
                            
                            const player = document.querySelector('#movie_player') || document.body;
                            observer.observe(player, { 
                                childList: true, 
                                subtree: true, 
                                attributes: true, 
                                attributeFilter: ['class', 'style'] 
                            });
                        })();
                    `);
                }
            });

            contents.debugger.on('message', (_event, method, params) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    if (method === 'Security.visibleSecurityStateChanged') {
                        mainWindow.webContents.send('security:state-changed', {
                            visibleSecurityState: params.visibleSecurityState,
                            timestamp: Date.now()
                        });
                    } else if (method === 'Network.responseReceived') {
                        mainWindow.webContents.send('network:cdp', {
                            method,
                            requestId: params.requestId,
                            timing: params.response.timing,
                            fromDiskCache: params.response.fromDiskCache,
                            fromServiceWorker: params.response.fromServiceWorker,
                            timestamp: Date.now()
                        });
                    } else if (method === 'Network.requestWillBeSent') {
                        mainWindow.webContents.send('network:cdp', { method, requestId: params.requestId, timestamp: Date.now() });
                    } else if (method === 'Network.loadingFinished') {
                        mainWindow.webContents.send('network:cdp', { method, requestId: params.requestId, timestamp: Date.now() });
                    }
                }
            });

            // Detach on destroy
            contents.once('destroyed', () => {
                try {
                    if (contents.debugger.isAttached()) contents.debugger.detach();
                } catch (e) { }
            });
        }
    });

    // Performance Control IPCs
    ipcMain.on('perf:throttle-cpu', (_e, { pid, rate }) => {
        const wc = webContents.getAllWebContents().find((w: any) => w.getOSProcessId() === pid);
        if (wc && wc.debugger.isAttached()) {
            wc.debugger.sendCommand('Emulation.setCPUThrottlingRate', { rate }).catch(console.error);
        }
    });

    ipcMain.on('perf:freeze', (_e, { pid, frozen }) => {
        const wc = webContents.getAllWebContents().find((w: any) => w.getOSProcessId() === pid);
        if (wc && wc.debugger.isAttached()) {
            // Simulate freeze with extreme throttling
            wc.debugger.sendCommand('Emulation.setCPUThrottlingRate', { rate: frozen ? 100 : 1 }).catch(console.error);
        }
    });

    ipcMain.on('perf:gc', (_e, { pid }) => {
        const wc = webContents.getAllWebContents().find((w: any) => w.getOSProcessId() === pid);
        if (wc && wc.debugger.isAttached()) {
            wc.debugger.sendCommand('HeapProfiler.enable').then(() => {
                return wc.debugger.sendCommand('HeapProfiler.collectGarbage');
            }).catch(console.error);
        }
    });

    ipcMain.on('perf:throttle-network', (_e, { pid, profile }) => {
        const wc = webContents.getAllWebContents().find((w: any) => w.getOSProcessId() === pid);
        if (wc && wc.debugger.isAttached()) {
            let conditions = { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 };
            if (profile === 'Slow 3G') {
                conditions = { offline: false, latency: 2000, downloadThroughput: 50 * 1024, uploadThroughput: 50 * 1024 };
            } else if (profile === 'Offline') {
                conditions = { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 };
            }
            wc.debugger.sendCommand('Network.emulateNetworkConditions', conditions).catch(console.error);
        }
    });

    const { ipcMain: ipc } = require('electron'); // Aliasing just to be safe if reusing
    ipc.on('network:block-url', (_e: any, patterns: string[]) => {
        const all = webContents.getAllWebContents();
        for (const wc of all) {
            try {
                if (wc.getType() === 'webview' && wc.debugger.isAttached()) {
                    wc.debugger.sendCommand('Network.setBlockedURLs', { urls: patterns });
                }
            } catch (e) { }
        }
    });

    // Security & Permissions
    // In-memory permission store for this session
    const activePermissions: Array<{
        id: number;
        origin: string;
        permission: string;
        status: 'granted' | 'denied';
    }> = [];

    session.defaultSession.setPermissionRequestHandler((webContents: any, permission: string, callback: any, details: any) => {
        // Auto-approve if already granted in our store (simple persistence)
        const check = activePermissions.find(p => p.origin === details.requestingUrl && p.permission === permission);
        if (check && check.status === 'granted') {
            return callback(true);
        }

        // Otherwise notify renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('security:permission-request', {
                origin: details.requestingUrl,
                permission,
                details
            });
        }

        // Default to false aka "Ask" (but here we block until approved or just let Electron handle prompt? 
        // Electron's default behavior without callback is to deny. 
        // We will approve for now to simplify, but in real app we'd wait for UI response.
        // For this demo: Auto-allow and log it for visualization
        activePermissions.push({ id: Date.now(), origin: details.requestingUrl, permission, status: 'granted' });
        callback(true);
    });

    ipcMain.handle('security:get-permissions', () => activePermissions);

    ipcMain.on('security:revoke', (_e, { origin, permission }) => {
        const idx = activePermissions.findIndex(p => p.origin === origin && p.permission === permission);
        if (idx !== -1) {
            activePermissions.splice(idx, 1);
        }
        // Force reload of pages on that origin to apply revocation? 
        // For now just removing from store so next request triggers prompt/log again.
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

});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

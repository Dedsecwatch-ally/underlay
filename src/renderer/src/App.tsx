import React from 'react';
import { motion } from 'framer-motion';
import { BrowserProvider, useBrowser } from './context/BrowserContext';
import { Titlebar } from './components/Titlebar';
import { AddressBar } from './components/AddressBar';
import { IntrospectionPanel } from './components/IntrospectionPanel';
// Lazy load heavy overlays
const HistoryOverlay = React.lazy(() => import('./components/HistoryOverlay').then(module => ({ default: module.HistoryOverlay })));
const SettingsOverlay = React.lazy(() => import('./components/SettingsOverlay').then(module => ({ default: module.SettingsOverlay })));
const CommandPalette = React.lazy(() => import('./components/CommandPalette').then(module => ({ default: module.CommandPalette })));
const ProfileOverlay = React.lazy(() => import('./components/ProfileOverlay').then(module => ({ default: module.ProfileOverlay })));
const DownloadsOverlay = React.lazy(() => import('./components/DownloadsOverlay').then(module => ({ default: module.DownloadsOverlay })));
import { DownloadToast } from './components/DownloadToast';

import { Activity, Clock, Settings, VenetianMask, Download as DownloadIcon } from 'lucide-react';
import { useFPS } from './hooks/useFPS';
import { useMobileGestures } from './hooks/useMobileGestures';
import { NewTabPage } from './components/NewTabPage';

import { LoadingScreen } from './components/LoadingScreen';
import { getPlatformElectron, isMobile } from './utils/PlatformUtils';
import { TabContent } from './components/TabContent';

// New UI Components
import { ErrorBoundary } from './components/ErrorBoundary';
import { PermissionOverlay } from './components/PermissionOverlay';
import { ContextMenu } from './components/ContextMenu';
import { CrashedTab } from './components/CrashedTab';
import { WallpaperPreloader } from './components/WallpaperPreloader';

function BrowserShell() {
    const { state, dispatch } = useBrowser();
    const fps = useFPS();
    useMobileGestures(); // Enable Swipe Gestures on Mobile
    const [showUnderlay, setShowUnderlay] = React.useState(false);
    const [showHistory, setShowHistory] = React.useState(false);
    const [showSettings, setShowSettings] = React.useState(false);
    const [showPalette, setShowPalette] = React.useState(false);
    const [showProfile, setShowProfile] = React.useState(false);
    const [showDownloads, setShowDownloads] = React.useState(false);
    const webviewRefs = React.useRef<{ [key: string]: any }>({});

    // Check if any download is active
    const isDownloading = state.downloads.some(d => d.state === 'progressing');

    // Toast Logic
    const [latestDownload, setLatestDownload] = React.useState<any>(null);
    React.useEffect(() => {
        if (state.downloads.length > 0) {
            setLatestDownload(state.downloads[0]);
        }
    }, [state.downloads]);

    // Auto Low Power Mode
    React.useEffect(() => {
        if (fps < 30 && !state.settings.lowPowerMode) {
            console.log("FPS drop detected. Switching to Low Power Mode.");
            dispatch({ type: 'SET_SETTING', payload: { key: 'lowPowerMode', value: true } });
        } else if (fps > 55 && state.settings.lowPowerMode) {
            // Optional: Auto recovery? Maybe keep off once triggered to be safe
            // dispatch({ type: 'SET_SETTING', payload: { key: 'lowPowerMode', value: false } });
        }
    }, [fps]);

    // Theme Management
    React.useEffect(() => {
        const applyTheme = () => {
            const theme = state.settings.theme;
            const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

            if (isDark) {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
            }
        };

        applyTheme();

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            if (state.settings.theme === 'system') applyTheme();
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [state.settings.theme]);

    // Apply class to body (Low Power Mode)
    React.useEffect(() => {
        if (state.settings.lowPowerMode) {
            document.body.classList.add('low-power');
        } else {
            document.body.classList.remove('low-power');
        }
    }, [state.settings.lowPowerMode]);

    // Global Shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCmd = e.metaKey || e.ctrlKey;

            if (isCmd && e.key === 'k') {
                e.preventDefault();
                setShowPalette(p => !p);
            }
            if (isCmd && e.key === 't') {
                e.preventDefault();
                dispatch({ type: 'NEW_TAB' });
            }
            if (isCmd && e.shiftKey && e.key === 'n') {
                e.preventDefault();
                dispatch({ type: 'NEW_TAB', payload: { incognito: true } });
            }
            if (isCmd && e.key === 'w') {
                e.preventDefault();
                const active = state.activeTabId;
                if (active) dispatch({ type: 'CLOSE_TAB', payload: { id: active } });
            }
            if (isCmd && e.key === 'l') {
                e.preventDefault();
                dispatch({ type: 'TRIGGER_COMMAND', payload: 'focusAddressBar' });
            }
            if (isCmd && e.key === 'r') {
                e.preventDefault();
                dispatch({ type: 'TRIGGER_COMMAND', payload: 'reload' });
            }
            if (isCmd && e.key === '[') {
                e.preventDefault();
                dispatch({ type: 'TRIGGER_COMMAND', payload: 'goBack' });
            }
            if (isCmd && e.key === ']') {
                e.preventDefault();
                dispatch({ type: 'TRIGGER_COMMAND', payload: 'goForward' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.activeTabId]);

    // Handle Commands
    React.useEffect(() => {
        if (state.activeCommand && state.activeTabId) {
            const webview = webviewRefs.current[state.activeTabId];
            if (webview) {
                try {
                    if (state.activeCommand.type === 'goBack') {
                        if (webview.isLoading()) webview.stop();
                        if (webview.canGoBack()) webview.goBack();
                    }
                    if (state.activeCommand.type === 'goForward' && webview.canGoForward()) webview.goForward();
                    if (state.activeCommand.type === 'reload') webview.reload();
                    if (state.activeCommand.type === 'stop') webview.stop();
                } catch (e) {
                    console.error("Webview command failed", e);
                }
            }

            // UI Toggle Commands
            if (state.activeCommand.type === 'toggleDevTools') setShowUnderlay(p => !p);
            if (state.activeCommand.type === 'toggleHistory') setShowHistory(p => !p);
            if (state.activeCommand.type === 'toggleSettings') setShowSettings(p => !p);

            dispatch({ type: 'CLEAR_COMMAND' });
        }
    }, [state.activeCommand, state.activeTabId]);

    // Performance Event Listener
    React.useEffect(() => {
        const electron = getPlatformElectron();
        const cleanup = electron.onPerformanceUpdate((data) => {
            state.tabs.forEach(tab => {
                const webview = webviewRefs.current[tab.id];
                if (webview && webview.getWebContentsId) {
                    try {
                        const wcId = webview.getWebContentsId();
                        const processInfo = data.processMap.find((p: any) => p.id === wcId);
                        if (processInfo && tab.pid !== processInfo.pid) {
                            dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { pid: processInfo.pid } } });
                        }
                    } catch (e) { }
                }
            });
        });
        return cleanup;
    }, [state.tabs]);

    // Download Listener
    React.useEffect(() => {
        const electron = getPlatformElectron();
        const cleanupDownloads = electron.onDownloadUpdate((data) => {
            dispatch({ type: 'UPDATE_DOWNLOAD', payload: data });
        });
        return cleanupDownloads;
    }, []);

    // Imperative Navigation Handler (Event Driven - No Loop)
    React.useEffect(() => {
        const handleLoadUrl = (e: CustomEvent) => {
            const { id, url } = e.detail;
            const webview = webviewRefs.current[id];
            if (webview) {
                try {
                    console.log(`[BrowserShell] Imperative Load: ${url}`);
                    webview.loadURL(url);
                } catch (err) {
                    console.error("Failed to load URL imperatively", err);
                }
            }
        };

        window.addEventListener('browser-load-url', handleLoadUrl as any);
        return () => window.removeEventListener('browser-load-url', handleLoadUrl as any);
    }, []);

    // Auto-Suspend Tabs (Memory Optimization)
    React.useEffect(() => {
        const checkSuspension = () => {
            if (state.settings.lowPowerMode) {
                const now = Date.now();
                state.tabs.forEach(tab => {
                    // Suspend if background & inactive for > 5 minutes (or 1 in low power)
                    if (tab.id !== state.activeTabId && !tab.suspended && tab.lastAccessed) {
                        // CRITICAL: Do not suspend if audio is playing (OTT/Music)
                        if (tab.audible) return;

                        if (now - tab.lastAccessed > 5 * 60 * 1000) {
                            console.log(`[AutoSuspend] Suspending inactive tab: ${tab.title}`);
                            dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { suspended: true } } });
                        }
                    }
                });
            }
        };
        const interval = setInterval(checkSuspension, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [state.tabs, state.activeTabId, state.settings.lowPowerMode]);


    return (
        <div className="h-full flex flex-col bg-underlay-bg text-underlay-text font-sans relative">
            {/* Overlays moved to bottom for Z-Index Stacking */}

            <DownloadToast latestDownload={latestDownload} />
            <PermissionOverlay />
            <ContextMenu />
            <WallpaperPreloader />

            <Titlebar />
            <div className="flex relative z-50">
                <div className="flex-1">
                    <AddressBar />
                </div>
                <div className="flex items-center gap-1.5 px-3 border-l border-white/5 h-12 non-draggable">
                    <motion.button
                        onClick={() => setShowDownloads(!showDownloads)}
                        animate={isDownloading ? { y: [0, -2, 0], color: '#60a5fa' } : { y: 0, color: '#ffffff66' }}
                        transition={isDownloading ? { repeat: Infinity, duration: 2 } : {}}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 active:scale-95 relative ${showDownloads ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'hover:text-white hover:bg-white/5'}`}
                        title="Downloads"
                    >
                        <DownloadIcon size={18} strokeWidth={1.5} />
                        {isDownloading && (
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full border border-[#0f0f11]"></span>
                        )}
                    </motion.button>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 active:scale-95 ${showHistory ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        title="History & Bookmarks"
                    >
                        <Clock size={18} strokeWidth={1.5} />
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 active:scale-95 ${showSettings ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        title="Settings"
                    >
                        <Settings size={18} strokeWidth={1.5} />
                    </button>
                    <button
                        onClick={() => dispatch({ type: 'NEW_TAB', payload: { incognito: true } })}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all duration-200 active:scale-95 hover:shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                        title="New Incognito Tab"
                    >
                        <VenetianMask size={18} strokeWidth={1.5} />
                    </button>

                </div>
                <div className="px-3 border-l border-white/5 h-12 flex items-center non-draggable">
                    <button
                        onClick={() => setShowProfile(!showProfile)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 overflow-hidden border ${showProfile ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-transparent bg-white/10 hover:bg-white/20'}`}
                        title="User Profile"
                    >
                        {state.profile?.avatar ? (
                            <img src={state.profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xs">
                                {state.profile?.name?.[0] || 'G'}
                            </div>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 relative flex overflow-hidden">
                <div className="flex-1 relative bg-[#0f0f11]">
                    {state.tabs.map(tab => (
                        <div
                            key={tab.id}
                            className="absolute inset-0 bg-[#0f0f11]"
                            style={{
                                visibility: tab.id === state.activeTabId ? 'visible' : 'hidden',
                                zIndex: tab.id === state.activeTabId ? 1 : 0,
                                opacity: tab.id === state.activeTabId ? 1 : 0, // Optional fade
                                pointerEvents: tab.id === state.activeTabId ? 'auto' : 'none',
                                // COMPOSITOR OPTIMIZATION
                                transform: 'translate3d(0,0,0)', // Force hardware acceleration
                                willChange: 'transform' // Hint to browser to create a layer
                            }}
                        >


                            {tab.url === 'underlay://newtab' ? (
                                <NewTabPage
                                    onNavigate={(url: string) => dispatch({ type: 'LOAD_URL', payload: { id: tab.id, url } })}
                                    incognito={tab.incognito}
                                />
                            ) : (
                                <TabContent
                                    id={tab.id}
                                    url={tab.url}
                                    isActive={tab.id === state.activeTabId}
                                    isSuspended={!!tab.suspended}
                                    isIncognito={!!tab.incognito}
                                    onCrashed={() => {
                                        console.warn(`Tab ${tab.id} crashed.`);
                                        dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { status: 'crashed' } } });
                                    }}
                                    onUnresponsive={() => {
                                        console.warn(`Tab ${tab.id} is unresponsive.`);
                                        // Do not immediately kill; let it recover
                                    }}
                                    onDidFailLoad={() => {
                                        console.warn(`Tab ${tab.id} failed to load.`);
                                        // Optional: dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { status: 'crashed' } } })
                                    }}
                                    onDidStartLoading={() => dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { status: 'loading' } } })}
                                    onDidStopLoading={({ url, title }) => {
                                        dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { status: 'ready', title, url } } });
                                        if (!tab.incognito) {
                                            dispatch({ type: 'ADD_HISTORY', payload: { url, title } });
                                        }
                                    }}
                                    onDidNavigate={(url) => dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { url } } })}
                                    onDomReady={() => {
                                        // Optional DOM ready logic
                                    }}
                                    onPageTitleUpdated={(title) => dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { title } } })}
                                    onPageFaviconUpdated={(favicon) => {
                                        // Placeholder for favicon updates
                                    }}
                                    onNewWindow={(url) => dispatch({ type: 'NEW_TAB', payload: { url } })}
                                    onProfileDetected={(profile) => {
                                        dispatch({
                                            type: 'UPDATE_PROFILE',
                                            payload: {
                                                isAuthenticated: true,
                                                name: profile.name,
                                                email: profile.email,
                                                avatar: profile.avatar
                                            }
                                        });
                                        // We just update the store. No redirection needed.
                                    }}
                                    onMediaStartedPlaying={() => dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { audible: true } } })}
                                    onMediaPaused={() => dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { audible: false } } })}
                                    onWebviewReady={(webview) => {
                                        webviewRefs.current[tab.id] = webview;
                                    }}
                                />
                            )}
                        </div>
                    ))}

                    {state.tabs.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-white/20">
                            No tabs open
                        </div>
                    )}
                </div>
                <IntrospectionPanel isOpen={showUnderlay} />
            </div>

            <React.Suspense fallback={null}>
                <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} />
                <HistoryOverlay isOpen={showHistory} onClose={() => setShowHistory(false)} />
                <SettingsOverlay isOpen={showSettings} onClose={() => setShowSettings(false)} />
                <ProfileOverlay isOpen={showProfile} onClose={() => setShowProfile(false)} />
                <DownloadsOverlay isOpen={showDownloads} onClose={() => setShowDownloads(false)} />
            </React.Suspense>
        </div>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <BrowserProvider>
                <BrowserShell />
            </BrowserProvider>
        </ErrorBoundary>
    );
}

export default App;

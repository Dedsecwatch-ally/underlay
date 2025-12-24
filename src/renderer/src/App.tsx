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

import { Activity, Clock, BatteryWarning, Settings, VenetianMask, Download as DownloadIcon } from 'lucide-react';
import { useFPS } from './hooks/useFPS';
import { NewTabPage } from './components/NewTabPage';
import { LoadingScreen } from './components/LoadingScreen';

function BrowserShell() {
    const { state, dispatch } = useBrowser();
    const fps = useFPS();
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
            console.log('Key:', e.key, 'Cmd:', isCmd);

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
                    if (state.activeCommand.type === 'goBack' && webview.canGoBack()) webview.goBack();
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

    // Handle PID Mapping from Performance Monitor
    React.useEffect(() => {
        const cleanup = window.electron.onPerformanceUpdate((data) => {
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

        // Handle Real Downloads
        const cleanupDownloads = window.electron.onDownloadUpdate((data) => {
            dispatch({ type: 'UPDATE_DOWNLOAD', payload: data });
        });

        return () => {
            cleanup();
            if (cleanupDownloads) cleanupDownloads();
        };
    }, [state.tabs]);

    // Imperative Navigation Sync (Fixes LOOP/ABORT issue)
    React.useEffect(() => {
        state.tabs.forEach(tab => {
            const webview = webviewRefs.current[tab.id];
            if (webview && tab.url && tab.url !== 'underlay://newtab') {
                try {
                    const current = webview.getURL();
                    const target = webview.dataset.targetUrl;

                    // 1. If currently on the correct URL (or very close), we are good.
                    // We check trailing slash differences to avoid unnecessary reloads
                    if (current === tab.url || current === tab.url + '/') {
                        webview.dataset.targetUrl = tab.url; // Sync
                        return;
                    }

                    // 2. If we are ALREADY attempting to load this URL, don't interrupt.
                    // This prevents the loop during the 'loading' phase before commit.
                    if (target === tab.url) return;

                    // 3. Otherwise, it's a new request. Navigate.
                    webview.loadURL(tab.url);
                    webview.dataset.targetUrl = tab.url; // Mark as in-progress
                } catch (e) { }
            }
        });
    }, [state.tabs]);

    return (
        <div className="h-full flex flex-col bg-underlay-bg text-underlay-text font-sans relative">
            {/* History Overlay Layer */}
            {/* History Overlay Layer */}
            <React.Suspense fallback={null}>
                <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} />
                <HistoryOverlay isOpen={showHistory} onClose={() => setShowHistory(false)} />
                <SettingsOverlay isOpen={showSettings} onClose={() => setShowSettings(false)} />
                <ProfileOverlay isOpen={showProfile} onClose={() => setShowProfile(false)} />
                <DownloadsOverlay isOpen={showDownloads} onClose={() => setShowDownloads(false)} />
            </React.Suspense>

            <DownloadToast latestDownload={latestDownload} />

            <Titlebar />
            <div className="flex">
                <div className="flex-1">
                    <AddressBar />
                </div>
                <div className="flex items-center gap-1.5 px-3 border-l border-white/5 h-12">
                    {/* Downloads Toggle (With Animation) */}
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
                    {/* History Toggle */}
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 active:scale-95 ${showHistory ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        title="History & Bookmarks"
                    >
                        <Clock size={18} strokeWidth={1.5} />
                    </button>
                    {/* Settings Toggle */}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 active:scale-95 ${showSettings ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        title="Settings"
                    >
                        <Settings size={18} strokeWidth={1.5} />
                    </button>
                    {/* Incognito Trigger */}
                    <button
                        onClick={() => dispatch({ type: 'NEW_TAB', payload: { incognito: true } })}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all duration-200 active:scale-95 hover:shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                        title="New Incognito Tab"
                    >
                        <VenetianMask size={18} strokeWidth={1.5} />
                    </button>
                    {/* Underlay Toggle */}
                    <button
                        onClick={() => setShowUnderlay(!showUnderlay)}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 active:scale-95 ${showUnderlay ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'text-white/40 hover:text-cyan-400 hover:bg-cyan-500/10'}`}
                        title="Performance Stats"
                    >
                        <Activity size={18} strokeWidth={1.5} />
                    </button>
                </div>
                {/* Profile Toggle (Right Side) */}
                <div className="px-3 border-l border-white/5 h-12 flex items-center">
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
                {state.settings.lowPowerMode && (
                    <div className="w-12 h-12 flex items-center justify-center border-l border-b border-white/5 bg-yellow-900/20 text-yellow-500" title="Low Power Mode Active">
                        <BatteryWarning size={18} />
                    </div>
                )}
            </div>

            {/* Viewport Area */}
            <div className="flex-1 relative flex overflow-hidden">
                <div className="flex-1 relative bg-[#0f0f11]">
                    {state.tabs.map(tab => (
                        <div
                            key={tab.id}
                            className="absolute inset-0 bg-[#0f0f11]"
                            style={{
                                display: tab.id === state.activeTabId ? 'block' : 'none',
                                zIndex: tab.id === state.activeTabId ? 1 : 0
                            }}
                        >
                            {tab.status === 'loading' && <LoadingScreen />}

                            {tab.url === 'underlay://newtab' ? (
                                <NewTabPage
                                    onNavigate={(url: string) => dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { url } } })}
                                    incognito={tab.incognito}
                                />
                            ) : (
                                <webview
                                    // Remove 'src' to prevent re-render loop. Use Imperative 'loadURL' via effect.
                                    // Use 'src' only for initial mount if needed, or handle in effect.
                                    // But webview needs src to start?
                                    // We can use defaultValue logic or just set it once?
                                    // React warns about uncontrolled if we don't track it, but webview is special.
                                    // Use ref to load initial.
                                    // Removed src prop to prevent re-render loop. Controlled via useEffect.
                                    // BETTER: Just rely on useEffect for all, but initial render needs it.
                                    // If we omit src, it's blank.
                                    // If we provide src, it navigates.
                                    // If we provide src={tab.url}, it navigates on every update.
                                    // FIX: Use `ref` callback to set initial SRC once?
                                    // Or `defaultValue`? webview doesn't support defaultValue.

                                    // Strategy: Pass `tab.url` ONLY if it differs from what we think it is?
                                    // No, declarative is strictly "make it this".

                                    // CORRECT FIX:
                                    // We will Keep `src` BUT we will Memoize the component or use key?
                                    // No, the issue is that `tab.url` changes to something that IS the current url, but react re-applies it.

                                    // Trying `src={undefined}` and handling all via effect?
                                    // Warning: webview tag might not work well empty.

                                    // Let's try: `src={tab.url}` but verify the loop theory first.
                                    // If I simply use the imperative effect ABOVE, I must REMOVE `src` here to avoid conflict.
                                    // So I'll strip `src` and use `useEffect` to drive it.

                                    // But initial load?
                                    // The useEffect runs on mount. It will see `current` (blank) != `tab.url`, and call `loadURL`.
                                    // This is cleaner.
                                    // Strategy: Use about:blank to initialize, then imperative loadURL via useEffect
                                    src="about:blank"
                                    className="w-full h-full"
                                    style={{ backgroundColor: '#0f0f11', border: 'none' }}
                                    allowpopups
                                    partition={tab.incognito ? 'underlay-incognito' : 'persist:underlay'}
                                    // @ts-ignore
                                    ref={(ref: any) => {
                                        if (ref) {
                                            webviewRefs.current[tab.id] = ref;

                                            if (!ref.dataset.attached) {
                                                ref.dataset.attached = "true";
                                                // Forward keyboard shortcuts from Webview to App
                                                ref.addEventListener('before-input-event', (e: any) => {
                                                    const { type, key, meta, control, shift } = e;
                                                    if (type !== 'keyDown') return;

                                                    const isCmd = meta || control;

                                                    // Forward specific shortcuts
                                                    const shortcuts = ['k', 't', 'w', 'l', 'r', '[', ']', 'ArrowLeft', 'ArrowRight'];
                                                    if (isCmd && (shortcuts.includes(key) || (key === 'n' && shift))) { // Allow Shift+Cmd+N
                                                        // Dispatch custom event to window or handle directly
                                                        const event = new KeyboardEvent('keydown', {
                                                            key: key,
                                                            metaKey: meta,
                                                            ctrlKey: control,
                                                            shiftKey: shift,
                                                            bubbles: true
                                                        });
                                                        window.dispatchEvent(event);
                                                    }
                                                });

                                                ref.addEventListener('did-start-loading', () => {
                                                    dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { status: 'loading' } } });
                                                    // Try to prevent white flash by injecting CSS early
                                                    ref.insertCSS('html, body { background-color: #0f0f11; }');
                                                });
                                                ref.addEventListener('did-stop-loading', () => {
                                                    const url = ref.getURL();
                                                    if (url === 'about:blank') return; // Ignore initial blank load

                                                    ref.dataset.targetUrl = ''; // Clear lock
                                                    dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { status: 'ready', title: ref.getTitle(), url } } });

                                                    // ADD HISTORY ENTRY (Only if NOT incognito)
                                                    if (!tab.incognito) {
                                                        dispatch({ type: 'ADD_HISTORY', payload: { url, title: ref.getTitle() } });
                                                    }
                                                });
                                                ref.addEventListener('did-navigate', (e: any) => {
                                                    if (e.url === 'about:blank') return;
                                                    dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { url: e.url } } });
                                                });
                                                ref.addEventListener('did-navigate-in-page', (e: any) => {
                                                    if (e.url === 'about:blank') return;
                                                    dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { url: e.url } } });
                                                });
                                                ref.addEventListener('did-fail-load', () => {
                                                    ref.dataset.targetUrl = ''; // Clear lock
                                                    dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { status: 'crashed' } } });
                                                });
                                                ref.addEventListener('crashed', () => {
                                                    ref.dataset.targetUrl = ''; // Clear lock
                                                    dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { status: 'crashed' } } });
                                                });
                                            }

                                            // REMOVED manual loadURL here because useEffect will handle it safely
                                            // now that src="about:blank" ensures webview is ready.
                                        }
                                    }}
                                />
                            )}
                            {/* Crash / Error Overlay */}
                            {tab.status === 'crashed' && (
                                <div className="absolute inset-0 bg-[#0f0f11] flex flex-col items-center justify-center text-white z-10">
                                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                        <Activity size={32} className="text-red-500" />
                                    </div>
                                    <h2 className="text-xl font-bold mb-2">Renderer Process Crashed</h2>
                                    <p className="text-white/50 mb-6 text-sm max-w-md text-center">
                                        The renderer process for this tab (PID: {tab.pid}) has terminated unexpectedly.
                                    </p>
                                    <button
                                        onClick={() => {
                                            const webview = webviewRefs.current[tab.id];
                                            if (webview) webview.reload();
                                        }}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
                                    >
                                        Reload Tab
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {state.tabs.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-white/20 bg-underlay-bg">
                            No tabs open
                        </div>
                    )}
                </div>

                <IntrospectionPanel isOpen={showUnderlay} />
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserProvider>
            <BrowserShell />
        </BrowserProvider>
    );
}

export default App;

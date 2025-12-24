import React from 'react';
import { BrowserProvider, useBrowser } from './context/BrowserContext';
import { Titlebar } from './components/Titlebar';
import { AddressBar } from './components/AddressBar';
import { IntrospectionPanel } from './components/IntrospectionPanel';
// Lazy load heavy overlays
const HistoryOverlay = React.lazy(() => import('./components/HistoryOverlay').then(module => ({ default: module.HistoryOverlay })));
const SettingsOverlay = React.lazy(() => import('./components/SettingsOverlay').then(module => ({ default: module.SettingsOverlay })));
const CommandPalette = React.lazy(() => import('./components/CommandPalette').then(module => ({ default: module.CommandPalette })));

import { Activity, Clock, BatteryWarning, Settings } from 'lucide-react';
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
    const webviewRefs = React.useRef<{ [key: string]: any }>({});

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
    }, [state.tabs]);

    return (
        <div className="h-full flex flex-col bg-underlay-bg text-underlay-text font-sans relative">
            {/* History Overlay Layer */}
            {/* History Overlay Layer */}
            <React.Suspense fallback={null}>
                <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} />
                <HistoryOverlay isOpen={showHistory} onClose={() => setShowHistory(false)} />
                <SettingsOverlay isOpen={showSettings} onClose={() => setShowSettings(false)} />
            </React.Suspense>

            <Titlebar />
            <div className="flex">
                <div className="flex-1">
                    <AddressBar />
                </div>
                {/* History Toggle */}
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`w-12 h-12 flex items-center justify-center border-l border-b border-white/5 bg-underlay-surface hover:text-white transition-colors ${showHistory ? 'text-underlay-accent bg-black/20' : 'text-white/40'}`}
                    title="History & Bookmarks"
                >
                    <Clock size={16} />
                </button>
                {/* Settings Toggle */}
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`w-12 h-12 flex items-center justify-center border-l border-b border-white/5 bg-underlay-surface hover:text-white transition-colors ${showSettings ? 'text-underlay-accent bg-black/20' : 'text-white/40'}`}
                    title="Settings"
                >
                    <Settings size={16} />
                </button>
                {/* Underlay Toggle */}
                <button
                    onClick={() => setShowUnderlay(!showUnderlay)}
                    className={`w-12 h-12 flex items-center justify-center border-l border-b border-white/5 bg-underlay-surface hover:text-white transition-colors ${showUnderlay ? 'text-underlay-accent bg-black/20' : 'text-white/40'}`}
                    title="Toggle Underlay"
                >
                    <Activity size={18} />
                </button>
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
                                <NewTabPage onNavigate={(url: string) => dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { url } } })} />
                            ) : (
                                <webview
                                    src={tab.url}
                                    className="w-full h-full"
                                    allowpopups
                                    // @ts-ignore
                                    ref={(ref: any) => {
                                        if (ref) {
                                            webviewRefs.current[tab.id] = ref;
                                            if (!ref.dataset.attached) {
                                                ref.dataset.attached = "true";

                                                // Forward keyboard shortcuts from Webview to App
                                                ref.addEventListener('before-input-event', (e: any) => {
                                                    const { type, key, meta, control } = e;
                                                    if (type !== 'keyDown') return;

                                                    const isCmd = meta || control;
                                                    // console.log('Webview Key:', key, 'Cmd:', isCmd);

                                                    // Forward specific shortcuts
                                                    const shortcuts = ['k', 't', 'w', 'l', 'r', '[', ']', 'ArrowLeft', 'ArrowRight'];
                                                    if (isCmd && shortcuts.includes(key)) {
                                                        // Dispatch custom event to window or handle directly
                                                        // We can just manually trigger the logic here or dispatch a window event
                                                        const event = new KeyboardEvent('keydown', {
                                                            key: key,
                                                            metaKey: meta,
                                                            ctrlKey: control,
                                                            bubbles: true
                                                        });
                                                        window.dispatchEvent(event);
                                                    }
                                                });

                                                ref.addEventListener('did-start-loading', () => {
                                                    dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { status: 'loading' } } });
                                                });
                                                ref.addEventListener('did-stop-loading', () => {
                                                    dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { status: 'ready', title: ref.getTitle(), url: ref.getURL() } } });
                                                    // ADD HISTORY ENTRY
                                                    dispatch({ type: 'ADD_HISTORY', payload: { url: ref.getURL(), title: ref.getTitle() } });
                                                });
                                                ref.addEventListener('did-navigate', (e: any) => {
                                                    dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { url: e.url } } });
                                                });
                                                ref.addEventListener('did-navigate-in-page', (e: any) => {
                                                    dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { url: e.url } } });
                                                });
                                                ref.addEventListener('did-fail-load', () => {
                                                    dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { status: 'crashed' } } });
                                                });
                                                ref.addEventListener('crashed', () => {
                                                    dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { status: 'crashed' } } });
                                                });
                                            }
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

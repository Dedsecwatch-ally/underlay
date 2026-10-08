import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserProvider, dispatch, getBrowserState, useBrowserState } from './context/BrowserContext';
import { useBrowserStore, NEW_TAB_URL, Tab } from './store/browserStore';
import { Titlebar } from './components/Titlebar';
import { Toolbar } from './components/Toolbar';
import { DownloadToast } from './components/DownloadToast';
import { NewTabPage } from './components/NewTabPage';
import { TabContent } from './components/TabContent';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PermissionOverlay } from './components/PermissionOverlay';
import { ContextMenu } from './components/ContextMenu';
import { Onboarding } from './components/Onboarding';
import { LibraryPage } from './pages/LibraryPage';
import { useMobileGestures } from './hooks/useMobileGestures';
import { recordBlocked } from './hooks/usePrivacyStats';
import { getPlatformElectron, isElectron } from './utils/PlatformUtils';
import { webviews } from './utils/webviews';

const HistoryOverlay = React.lazy(() => import('./components/HistoryOverlay').then(m => ({ default: m.HistoryOverlay })));
const SettingsOverlay = React.lazy(() => import('./components/SettingsOverlay').then(m => ({ default: m.SettingsOverlay })));
const CommandPalette = React.lazy(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));
const ProfileOverlay = React.lazy(() => import('./components/ProfileOverlay').then(m => ({ default: m.ProfileOverlay })));
const DownloadsOverlay = React.lazy(() => import('./components/DownloadsOverlay').then(m => ({ default: m.DownloadsOverlay })));

type Panel = 'history' | 'settings' | 'palette' | 'profile' | 'downloads' | null;

const MINUTE = 60_000;

// ---------------------------------------------------------------------------
// Commands (keyboard shortcuts, menu items and toolbar buttons)
// ---------------------------------------------------------------------------

function activeWebview() {
    return webviews.get(getBrowserState().activeTabId);
}

function selectTab(index: number) {
    const { tabs } = getBrowserState();
    const tab = index < 0 ? tabs[tabs.length - 1] : tabs[index];
    if (tab) dispatch({ type: 'SWITCH_TAB', payload: { id: tab.id } });
}

function cycleTab(step: number) {
    const { tabs, activeTabId } = getBrowserState();
    const index = tabs.findIndex(t => t.id === activeTabId);
    selectTab((index + step + tabs.length) % tabs.length);
}

function withWebview(fn: (webview: Electron.WebviewTag) => void) {
    const webview = activeWebview();
    if (!webview) return;
    try {
        fn(webview);
    } catch (e) {
        console.warn('[Command] Webview not ready:', e);
    }
}

function zoom(delta: number | null) {
    withWebview(webview => webview.setZoomLevel(delta === null ? 0 : Math.max(-3, Math.min(5, webview.getZoomLevel() + delta))));
}

// Fallback for the web/mobile build, where there is no main process to
// translate key presses into commands.
function commandForKey(e: KeyboardEvent): string | null {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return null;
    const key = e.key.toLowerCase();
    if (e.shiftKey && key === 'n') return 'new-incognito-tab';
    if (e.shiftKey && key === 't') return 'reopen-closed-tab';
    if (e.shiftKey && key === 'o') return 'library';
    const map: Record<string, string> = { t: 'new-tab', w: 'close-tab', l: 'focus-address-bar', k: 'command-palette', r: 'reload', '[': 'back', ']': 'forward', ',': 'settings' };
    if (map[key]) return map[key];
    if (/^[1-9]$/.test(key)) return `select-tab-${key}`;
    return null;
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TabView = React.memo(function TabView({ tab, isActive }: { tab: Tab; isActive: boolean }) {
    let content: React.ReactNode;
    if (tab.url.startsWith('underlay://library')) {
        const view = tab.url.includes('bookmarks') ? 'bookmarks' : tab.url.includes('downloads') ? 'downloads' : 'history';
        content = <LibraryPage initialView={view} isActive={isActive} />;
    } else if (tab.url === NEW_TAB_URL) {
        content = (
            <NewTabPage
                isActive={isActive}
                incognito={tab.incognito}
                onNavigate={(url: string) => dispatch({ type: 'LOAD_URL', payload: { id: tab.id, url } })}
            />
        );
    } else {
        content = (
            <TabContent
                id={tab.id}
                url={tab.url}
                isActive={isActive}
                isSuspended={!!tab.suspended}
                isIncognito={!!tab.incognito}
                isCrashed={tab.status === 'crashed'}
                readerActive={tab.readerActive}
                readerContent={tab.readerContent}
            />
        );
    }

    // Inactive tabs stay mounted (keeping their page alive) but are taken out
    // of layout and hit-testing entirely.
    return (
        <div
            className="absolute inset-0 bg-underlay-bg"
            style={{ visibility: isActive ? 'visible' : 'hidden', zIndex: isActive ? 1 : 0, contain: 'strict' }}
            aria-hidden={!isActive}
        >
            {content}
        </div>
    );
});

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export const BrowserShell: React.FC = () => {
    const { tabs, activeTabId, theme, lowPowerMode, activeCommand, latestDownload } = useBrowserState(s => ({
        tabs: s.tabs,
        activeTabId: s.activeTabId,
        theme: s.settings.theme,
        lowPowerMode: s.settings.lowPowerMode,
        activeCommand: s.activeCommand,
        latestDownload: s.downloads[0]
    }));
    useMobileGestures();

    const [isOnboarding, setIsOnboarding] = React.useState<boolean | null>(null);
    const [panel, setPanel] = React.useState<Panel>(null);
    const togglePanel = React.useCallback((next: Exclude<Panel, null>) => setPanel(p => (p === next ? null : next)), []);
    const closePanel = React.useCallback(() => setPanel(null), []);
    // Panels are loaded on first use and then stay mounted so they can animate
    // out; they only subscribe to the store while open.
    const [used, setUsed] = React.useState<Set<Panel>>(() => new Set());
    React.useEffect(() => {
        if (panel && !used.has(panel)) setUsed(prev => new Set(prev).add(panel));
    }, [panel, used]);

    React.useEffect(() => {
        getPlatformElectron().onboarding.checkStatus()
            .then(done => setIsOnboarding(!done))
            .catch(() => setIsOnboarding(false));
    }, []);

    const runCommand = React.useCallback((command: string) => {
        const { activeTabId: active } = getBrowserState();
        switch (command) {
            case 'new-tab': return dispatch({ type: 'NEW_TAB' });
            case 'new-incognito-tab': return dispatch({ type: 'NEW_TAB', payload: { incognito: true } });
            case 'reopen-closed-tab': return dispatch({ type: 'REOPEN_CLOSED_TAB' });
            case 'close-tab': return active && dispatch({ type: 'CLOSE_TAB', payload: { id: active } });
            case 'focus-address-bar': return dispatch({ type: 'TRIGGER_COMMAND', payload: 'focusAddressBar' });
            case 'reload': return withWebview(w => w.reload());
            case 'hard-reload': return withWebview(w => w.reloadIgnoringCache());
            case 'stop': return withWebview(w => w.stop());
            case 'back': return withWebview(w => { if (w.canGoBack()) w.goBack(); });
            case 'forward': return withWebview(w => { if (w.canGoForward()) w.goForward(); });
            case 'zoom-in': return zoom(0.5);
            case 'zoom-out': return zoom(-0.5);
            case 'zoom-reset': return zoom(null);
            case 'next-tab': return cycleTab(1);
            case 'prev-tab': return cycleTab(-1);
            case 'command-palette': return togglePanel('palette');
            case 'settings': return setPanel('settings');
            case 'library': return dispatch({ type: 'NEW_TAB', payload: { url: 'underlay://library?view=history' } });
            case 'customize-toolbar': return dispatch({ type: 'TOGGLE_CUSTOMIZE_TOOLBAR' });
            default:
                if (command.startsWith('select-tab-')) {
                    const n = Number(command.slice('select-tab-'.length));
                    selectTab(n === 9 ? -1 : n - 1);
                }
        }
    }, [togglePanel]);

    // Shortcuts & menu items arrive from the main process.
    React.useEffect(() => {
        if (isElectron) return window.electron.onCommand(runCommand);
        const onKeyDown = (e: KeyboardEvent) => {
            const command = commandForKey(e);
            if (command) {
                e.preventDefault();
                runCommand(command);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [runCommand]);

    // Toolbar buttons go through the store's command channel.
    React.useEffect(() => {
        if (!activeCommand) return;
        const map: Partial<Record<typeof activeCommand.type, () => void>> = {
            goBack: () => runCommand('back'),
            goForward: () => runCommand('forward'),
            reload: () => runCommand('reload'),
            stop: () => runCommand('stop'),
            toggleHistory: () => togglePanel('history'),
            toggleSettings: () => togglePanel('settings'),
            toggleDownloads: () => togglePanel('downloads'),
            toggleProfile: () => togglePanel('profile')
        };
        const handler = map[activeCommand.type];
        if (handler) {
            handler();
            dispatch({ type: 'CLEAR_COMMAND' });
        }
        // 'focusAddressBar' is consumed (and cleared) by the address bar.
    }, [activeCommand, runCommand, togglePanel]);

    // Theme
    React.useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const apply = () => {
            const dark = theme === 'dark' || (theme === 'system' && media.matches);
            document.documentElement.classList.toggle('dark', dark);
            document.documentElement.classList.toggle('light', !dark);
        };
        apply();
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, [theme]);

    React.useEffect(() => {
        document.body.classList.toggle('low-power', lowPowerMode);
    }, [lowPowerMode]);

    // Main-process events
    React.useEffect(() => {
        if (!isElectron) return;
        const electron = window.electron;
        const cleanups = [
            electron.onDownloadUpdate(data => dispatch({ type: 'UPDATE_DOWNLOAD', payload: data })),
            electron.onOpenTab(({ url, incognito, background }) => dispatch({ type: 'NEW_TAB', payload: { url, incognito, background } })),
            electron.onPowerModeChanged(({ isOnBattery }) => getBrowserState().setOnBattery(isOnBattery)),
            electron.account.onChanged(account => dispatch({ type: 'SET_ACCOUNT', payload: account })),
            electron.privacy.onTrackerBlockedBatch(batch => {
                const byTab = new Map<string, any[]>();
                for (const item of batch) {
                    const tabId = webviews.tabForContents(item.tabId);
                    if (!tabId) continue;
                    if (!byTab.has(tabId)) byTab.set(tabId, []);
                    byTab.get(tabId)!.push(item);
                }
                byTab.forEach((items, id) => dispatch({ type: 'ADD_BLOCKED_ITEMS', payload: { id, items } }));
                recordBlocked(batch);
            })
        ];

        electron.getPowerState().then(({ isOnBattery }) => getBrowserState().setOnBattery(isOnBattery)).catch(() => { });
        electron.account.get().then(account => dispatch({ type: 'SET_ACCOUNT', payload: account })).catch(() => { });

        // Move passwords saved by older versions into the encrypted vault.
        const legacy = getBrowserState().legacyPasswords;
        if (legacy?.length) {
            electron.vault.importLegacy(legacy)
                .then(() => getBrowserState().clearLegacyPasswords())
                .catch(e => console.error('[Vault] Migration failed; will retry next launch:', e));
        }

        // When the last private tab closes, wipe everything it left behind.
        const unsubscribe = useBrowserStore.subscribe((state, prev) => {
            if (state.tabs !== prev.tabs && prev.tabs.some(t => t.incognito) && !state.tabs.some(t => t.incognito)) {
                electron.privacy.clearIncognito().catch(() => { });
            }
        });

        return () => {
            cleanups.forEach(fn => fn());
            unsubscribe();
        };
    }, []);

    // Memory saver: put background tabs to sleep after a period of inactivity
    // (sooner on battery or in Low Power Mode). Tabs playing audio are spared.
    React.useEffect(() => {
        const interval = setInterval(() => {
            const { tabs: all, activeTabId: active, settings, onBattery, suspendTab } = getBrowserState();
            const limit = settings.lowPowerMode ? 5 * MINUTE : onBattery ? 15 * MINUTE : 60 * MINUTE;
            const now = Date.now();
            for (const tab of all) {
                if (tab.id === active || tab.suspended || tab.audible || tab.url === NEW_TAB_URL) continue;
                if (now - (tab.lastAccessed ?? now) > limit) suspendTab(tab.id);
            }
        }, MINUTE);
        return () => clearInterval(interval);
    }, []);

    if (isOnboarding === null) return null;

    return (
        <div className="h-full flex flex-col bg-underlay-bg text-underlay-text font-sans relative">
            <AnimatePresence>
                {isOnboarding && (
                    <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="fixed inset-0 z-[200]">
                        <Onboarding onComplete={() => setIsOnboarding(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            <DownloadToast latestDownload={latestDownload} />
            <PermissionOverlay />
            <ContextMenu />

            <Titlebar />
            <Toolbar />

            <main className="flex-1 relative overflow-hidden bg-underlay-bg">
                {tabs.map(tab => (
                    <TabView key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
                ))}
            </main>

            <React.Suspense fallback={null}>
                {used.has('palette') && <CommandPalette isOpen={panel === 'palette'} onClose={closePanel} />}
                {used.has('history') && <HistoryOverlay isOpen={panel === 'history'} onClose={closePanel} />}
                {used.has('settings') && <SettingsOverlay isOpen={panel === 'settings'} onClose={closePanel} />}
                {used.has('profile') && <ProfileOverlay isOpen={panel === 'profile'} onClose={closePanel} />}
                {used.has('downloads') && <DownloadsOverlay isOpen={panel === 'downloads'} onClose={closePanel} />}
            </React.Suspense>
        </div>
    );
};

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

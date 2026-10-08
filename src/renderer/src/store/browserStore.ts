import { create } from 'zustand';
import { persist, PersistStorage, StorageValue } from 'zustand/middleware';
import type { SearchEngineId } from '../utils/omnibox';

export type TabStatus = 'init' | 'loading' | 'ready' | 'crashed' | 'destroyed';

export interface BlockedStats {
    ads: number;
    trackers: number;
    fingerprinters: number;
    cryptominers: number;
    social: number;
    history: Array<{ url: string; domain: string; type: string; timestamp: number }>;
}

export interface Tab {
    id: string;
    url: string;
    title: string;
    status: TabStatus;
    favicon?: string;
    pid?: number;
    incognito?: boolean;
    suspended?: boolean;
    lastAccessed?: number;
    audible?: boolean;
    canGoBack?: boolean;
    canGoForward?: boolean;
    readerActive?: boolean;
    readerContent?: any;
    blockedStats?: BlockedStats;
    webContentsId?: number;
}

export interface HistoryEntry {
    id: string;
    url: string;
    title: string;
    timestamp: number;
}

export interface Bookmark {
    id: string;
    url: string;
    title: string;
    tags: string[];
    timestamp: number;
}

export interface DownloadItem {
    id: string;
    filename: string;
    path?: string;
    url: string;
    state: 'progressing' | 'paused' | 'completed' | 'cancelled' | 'interrupted' | 'failed';
    receivedBytes: number;
    totalBytes: number;
}

/** Local, on-device profile. The Google account (if any) lives in `account`. */
export interface UserProfile {
    name: string;
    avatar?: string;
}

export interface Settings {
    lowPowerMode: boolean;
    theme: 'dark' | 'light' | 'system';
    searchEngine: SearchEngineId;
}

export type CommandType = 'goBack' | 'goForward' | 'reload' | 'stop' | 'focusAddressBar' | 'toggleDevTools' | 'toggleHistory' | 'toggleSettings' | 'toggleDownloads' | 'toggleProfile';

export const NEW_TAB_URL = 'underlay://newtab';
const DEFAULT_TOOLBAR = ['back', 'forward', 'reload', 'urlbar', 'downloads', 'history', 'settings', 'incognito', 'profile'];
const MAX_HISTORY = 5000;
const MAX_CLOSED_TABS = 25;

export interface BrowserState {
    tabs: Tab[];
    activeTabId: string;
    activeCommand?: { type: CommandType; id: number };
    history: HistoryEntry[];
    bookmarks: Bookmark[];
    downloads: DownloadItem[];
    settings: Settings;
    profile: UserProfile;
    account: GoogleAccount | null;
    onBattery: boolean;
    closedTabs: Array<{ url: string; title: string }>;
    toolbarLayout: string[];
    isCustomizingToolbar: boolean;
    /** Plaintext passwords from older versions, waiting to move into the vault. */
    legacyPasswords?: Array<{ url: string; username: string; password: string }>;

    // Actions
    addTab: (url?: string, incognito?: boolean, background?: boolean) => void;
    closeTab: (id: string) => void;
    reopenClosedTab: () => void;
    switchTab: (id: string) => void;
    suspendTab: (id: string) => void;
    updateTab: (id: string, data: Partial<Tab>) => void;
    triggerCommand: (type: CommandType) => void;
    clearCommand: () => void;
    addHistory: (url: string, title: string) => void;
    removeHistoryItem: (id: string) => void;
    clearHistory: () => void;
    toggleBookmark: (url: string, title: string) => void;
    updateBookmark: (url: string, title: string, tags: string[]) => void;
    importBookmarks: (bookmarks: Array<{ title: string; url: string }>) => void;
    updateDownload: (id: string, data: Partial<DownloadItem>) => void;
    clearDownloads: () => void;
    setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
    updateProfile: (data: Partial<UserProfile>) => void;
    setAccount: (account: GoogleAccount | null) => void;
    setOnBattery: (onBattery: boolean) => void;
    addBlockedItems: (id: string, items: any[]) => void;
    setToolbarLayout: (layout: string[]) => void;
    toggleCustomizeToolbar: () => void;
    resetToolbarLayout: () => void;
    clearLegacyPasswords: () => void;
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

// Persistence is debounced and serialised lazily: the old setup stringified
// the whole history into localStorage on every single state change.
function createDebouncedStorage<S>(delay = 400): PersistStorage<S> {
    let pending: { name: string; value: StorageValue<S> } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
        if (timer) clearTimeout(timer);
        timer = null;
        if (!pending) return;
        try {
            localStorage.setItem(pending.name, JSON.stringify(pending.value));
        } catch (e) {
            console.error('[Store] Failed to persist state:', e);
        }
        pending = null;
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', flush);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') flush();
        });
    }

    return {
        getItem: (name) => {
            const raw = localStorage.getItem(name);
            return raw ? JSON.parse(raw) : null;
        },
        setItem: (name, value) => {
            pending = { name, value };
            if (!timer) timer = setTimeout(flush, delay);
        },
        removeItem: (name) => {
            pending = null;
            localStorage.removeItem(name);
        }
    };
}

// Only durable fields of a tab are persisted.
const persistTab = ({ id, url, title, favicon, lastAccessed }: Tab): Tab => ({
    id,
    url,
    title,
    favicon,
    lastAccessed,
    status: 'ready',
    // Restored tabs load lazily, when first selected.
    suspended: true
});

export const useBrowserStore = create<BrowserState>()(
    persist(
        (set, get) => ({
            tabs: [{ id: 'init', url: NEW_TAB_URL, title: 'New Tab', status: 'ready' }],
            activeTabId: 'init',
            history: [],
            bookmarks: [],
            downloads: [],
            settings: { lowPowerMode: false, theme: 'dark', searchEngine: 'google' },
            profile: { name: '' },
            account: null,
            onBattery: false,
            closedTabs: [],
            toolbarLayout: DEFAULT_TOOLBAR,
            isCustomizingToolbar: false,

            addTab: (url = NEW_TAB_URL, incognito = false, background = false) => {
                const tab: Tab = {
                    id: newId(),
                    url,
                    title: incognito ? 'Private Tab' : 'New Tab',
                    status: 'ready',
                    incognito,
                    lastAccessed: Date.now()
                };
                set(state => {
                    // Open next to the current tab, like Safari and Chrome.
                    const index = state.tabs.findIndex(t => t.id === state.activeTabId);
                    const tabs = [...state.tabs];
                    tabs.splice(index === -1 ? tabs.length : index + 1, 0, tab);
                    return { tabs, activeTabId: background ? state.activeTabId : tab.id };
                });
            },

            closeTab: (id) => {
                set(state => {
                    const index = state.tabs.findIndex(t => t.id === id);
                    if (index === -1) return state;
                    const closing = state.tabs[index];
                    const tabs = state.tabs.filter(t => t.id !== id);
                    const closedTabs = closing.incognito || closing.url === NEW_TAB_URL
                        ? state.closedTabs
                        : [{ url: closing.url, title: closing.title }, ...state.closedTabs].slice(0, MAX_CLOSED_TABS);

                    if (tabs.length === 0) {
                        const fresh: Tab = { id: newId(), url: NEW_TAB_URL, title: 'New Tab', status: 'ready' };
                        return { tabs: [fresh], activeTabId: fresh.id, closedTabs };
                    }
                    let activeTabId = state.activeTabId;
                    if (activeTabId === id) activeTabId = (tabs[index] ?? tabs[index - 1]).id;
                    return { tabs, activeTabId, closedTabs };
                });
            },

            reopenClosedTab: () => {
                const [last, ...rest] = get().closedTabs;
                if (!last) return;
                set({ closedTabs: rest });
                get().addTab(last.url);
            },

            switchTab: (id) => set(state => ({
                activeTabId: id,
                tabs: state.tabs.map(t => t.id === id ? { ...t, lastAccessed: Date.now(), suspended: false } : t)
            })),

            suspendTab: (id) => set(state => ({
                tabs: state.tabs.map(t => t.id === id && t.id !== state.activeTabId ? { ...t, suspended: true, status: 'ready' } : t)
            })),

            updateTab: (id, data) => set(state => {
                const index = state.tabs.findIndex(t => t.id === id);
                if (index === -1) return state;
                const current = state.tabs[index];
                // Skip no-op updates so subscribers don't re-render needlessly.
                if ((Object.keys(data) as (keyof Tab)[]).every(k => current[k] === data[k])) return state;
                const tabs = [...state.tabs];
                tabs[index] = { ...current, ...data };
                return { tabs };
            }),

            triggerCommand: (type) => set({ activeCommand: { type, id: Date.now() } }),
            clearCommand: () => set({ activeCommand: undefined }),

            addHistory: (url, title) => set(state => {
                const top = state.history[0];
                if (top?.url === url) {
                    if (top.title === title) return state;
                    return { history: [{ ...top, title }, ...state.history.slice(1)] };
                }
                return {
                    history: [{ id: newId(), url, title, timestamp: Date.now() }, ...state.history].slice(0, MAX_HISTORY)
                };
            }),

            removeHistoryItem: (id) => set(state => ({ history: state.history.filter(h => h.id !== id) })),
            clearHistory: () => set({ history: [], closedTabs: [] }),

            toggleBookmark: (url, title) => set(state => {
                if (state.bookmarks.some(b => b.url === url)) {
                    return { bookmarks: state.bookmarks.filter(b => b.url !== url) };
                }
                return { bookmarks: [{ id: newId(), url, title, tags: [], timestamp: Date.now() }, ...state.bookmarks] };
            }),

            updateBookmark: (url, _title, tags) => set(state => ({
                bookmarks: state.bookmarks.map(b => b.url === url ? { ...b, tags } : b)
            })),

            importBookmarks: (bookmarks) => set(state => {
                const known = new Set(state.bookmarks.map(b => b.url));
                const imported = bookmarks
                    .filter(b => !known.has(b.url) && (known.add(b.url), true))
                    .map(b => ({ id: newId(), url: b.url, title: b.title, tags: [], timestamp: Date.now() }));
                return imported.length ? { bookmarks: [...imported, ...state.bookmarks] } : state;
            }),

            updateDownload: (id, data) => set(state => {
                const index = state.downloads.findIndex(d => d.id === id);
                if (index > -1) {
                    const downloads = [...state.downloads];
                    downloads[index] = { ...downloads[index], ...data };
                    return { downloads };
                }
                if (data.filename && data.url) {
                    return { downloads: [{ receivedBytes: 0, totalBytes: 0, ...data } as DownloadItem, ...state.downloads] };
                }
                return state;
            }),

            clearDownloads: () => set(state => ({ downloads: state.downloads.filter(d => d.state === 'progressing' || d.state === 'paused') })),

            setSetting: (key, value) => set(state => ({ settings: { ...state.settings, [key]: value } })),
            updateProfile: (data) => set(state => ({ profile: { ...state.profile, ...data } })),
            setAccount: (account) => set({ account }),
            setOnBattery: (onBattery) => set({ onBattery }),

            addBlockedItems: (id, items) => set(state => {
                const index = state.tabs.findIndex(t => t.id === id);
                if (index === -1 || items.length === 0) return state;
                const tab = state.tabs[index];
                const stats: BlockedStats = tab.blockedStats
                    ? { ...tab.blockedStats }
                    : { ads: 0, trackers: 0, fingerprinters: 0, cryptominers: 0, social: 0, history: [] };

                for (const item of items) {
                    if (item.type === 'Ad') stats.ads++;
                    else if (item.type === 'Tracker') stats.trackers++;
                    else if (item.type === 'Fingerprinter') stats.fingerprinters++;
                    else if (item.type === 'Cryptominer') stats.cryptominers++;
                    else if (item.type === 'Social') stats.social++;
                }
                stats.history = [
                    ...stats.history,
                    ...items.map(i => ({ url: i.url, domain: i.domain, type: i.type, timestamp: i.timestamp }))
                ].slice(-50);

                const tabs = [...state.tabs];
                tabs[index] = { ...tab, blockedStats: stats };
                return { tabs };
            }),

            setToolbarLayout: (layout) => set({ toolbarLayout: layout }),
            toggleCustomizeToolbar: () => set(state => ({ isCustomizingToolbar: !state.isCustomizingToolbar })),
            resetToolbarLayout: () => set({ toolbarLayout: DEFAULT_TOOLBAR }),
            clearLegacyPasswords: () => set({ legacyPasswords: undefined })
        }),
        {
            name: 'underlay-storage',
            version: 1,
            storage: createDebouncedStorage(),
            partialize: (state) => {
                const tabs = state.tabs.filter(t => !t.incognito).map(persistTab);
                return {
                    history: state.history,
                    bookmarks: state.bookmarks,
                    profile: state.profile,
                    settings: state.settings,
                    toolbarLayout: state.toolbarLayout,
                    legacyPasswords: state.legacyPasswords,
                    tabs,
                    activeTabId: tabs.some(t => t.id === state.activeTabId) ? state.activeTabId : tabs[0]?.id
                } as unknown as BrowserState;
            },
            migrate: (persisted: any, version) => {
                if (version < 1 && persisted) {
                    // Passwords used to sit in localStorage in plain text.
                    if (Array.isArray(persisted.passwords) && persisted.passwords.length) {
                        persisted.legacyPasswords = persisted.passwords.map(({ url, username, password }: any) => ({ url, username, password }));
                    }
                    delete persisted.passwords;
                    const profile = persisted.profile ?? {};
                    persisted.profile = {
                        name: profile.name && profile.name !== 'Guest' ? profile.name : '',
                        avatar: profile.avatar?.startsWith('https://api.dicebear.com') ? undefined : profile.avatar
                    };
                    persisted.settings = { searchEngine: 'google', ...persisted.settings };
                }
                return persisted;
            },
            merge: (persisted: any, current) => {
                const merged = { ...current, ...persisted, settings: { ...current.settings, ...persisted?.settings } };
                if (!merged.tabs?.length) {
                    merged.tabs = current.tabs;
                    merged.activeTabId = current.activeTabId;
                }
                // The selected tab loads immediately; the rest stay asleep.
                merged.tabs = merged.tabs.map((t: Tab) => t.id === merged.activeTabId ? { ...t, suspended: false } : t);
                if (!merged.tabs.some((t: Tab) => t.id === merged.activeTabId)) merged.activeTabId = merged.tabs[0].id;
                return merged;
            }
        }
    )
);

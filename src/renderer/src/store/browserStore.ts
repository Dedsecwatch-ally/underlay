import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type TabStatus = 'init' | 'loading' | 'ready' | 'crashed' | 'destroyed';

export interface Tab {
    id: string;
    url: string;
    title: string;
    status: TabStatus;
    pid?: number;
    incognito?: boolean;
    suspended?: boolean;
    lastAccessed?: number;
    audible?: boolean;
    readerActive?: boolean;
    readerContent?: any;
    blockedStats?: {
        ads: number;
        trackers: number;
        fingerprinters: number;
        cryptominers: number;
        social: number;
        history: Array<{ url: string; domain: string; type: string; timestamp: number }>;
    };
    webContentsId?: number; // Main Process ID for mapping
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

export interface Password {
    id: string;
    url: string;
    username: string;
    password: string;
    createdAt: number;
}

export interface UserProfile {
    name: string;
    email: string;
    avatar?: string;
    isAuthenticated: boolean;
}

export type CommandType = 'goBack' | 'goForward' | 'reload' | 'stop' | 'focusAddressBar' | 'toggleDevTools' | 'toggleHistory' | 'toggleSettings' | 'toggleDownloads' | 'toggleProfile';

export interface BrowserState {
    tabs: Tab[];
    activeTabId: string;
    activeCommand?: { type: CommandType, id: number };
    history: HistoryEntry[];
    bookmarks: Bookmark[];
    passwords: Password[];
    downloads: DownloadItem[];
    settings: {
        lowPowerMode: boolean;
        theme: 'dark' | 'light' | 'system';
    };
    profile: UserProfile;
    toolbarLayout: string[];
    isCustomizingToolbar: boolean;

    // Actions
    addTab: (url?: string, incognito?: boolean) => void;
    closeTab: (id: string) => void;
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
    importBookmarks: (bookmarks: Array<{ title: string, url: string }>) => void;
    addPassword: (data: Omit<Password, 'id' | 'createdAt'>) => void;
    removePassword: (id: string) => void;
    updateDownload: (id: string, data: Partial<DownloadItem>) => void;
    setSetting: (key: string, value: any) => void;
    updateProfile: (data: Partial<UserProfile>) => void;
    addBlockedItems: (id: string, items: any[]) => void;
    setToolbarLayout: (layout: string[]) => void;
    toggleCustomizeToolbar: () => void;
    resetToolbarLayout: () => void;
}

export const useBrowserStore = create<BrowserState>()(
    persist(
        (set, get) => ({
            tabs: [{ id: 'init', url: 'underlay://newtab', title: 'New Tab', status: 'ready' }],
            activeTabId: 'init',
            history: [],
            bookmarks: [],
            passwords: [],
            downloads: [],
            settings: { lowPowerMode: false, theme: 'dark' },
            profile: { name: 'Guest', email: '', isAuthenticated: false },
            toolbarLayout: ['back', 'forward', 'reload', 'urlbar', 'downloads', 'history', 'settings', 'incognito', 'profile'],
            isCustomizingToolbar: false,

            addTab: (url = 'underlay://newtab', incognito = false) => {
                const newId = Math.random().toString(36).substr(2, 9);
                const newTab: Tab = {
                    id: newId,
                    url,
                    title: incognito ? 'New Incognito Tab' : 'New Tab',
                    status: 'ready',
                    incognito
                };
                set((state) => ({
                    tabs: [...state.tabs, newTab],
                    activeTabId: newId
                }));
            },

            closeTab: (id) => {
                set((state) => {
                    const filteredTabs = state.tabs.filter(t => t.id !== id);
                    if (filteredTabs.length === 0) {
                        return { tabs: [], activeTabId: '' };
                    }
                    let newActiveId = state.activeTabId;
                    if (state.activeTabId === id) {
                        const index = state.tabs.findIndex(t => t.id === id);
                        newActiveId = (state.tabs[index - 1] || state.tabs[index + 1] || filteredTabs[0]).id;
                    }
                    return { tabs: filteredTabs, activeTabId: newActiveId };
                });
            },

            switchTab: (id) => set((state) => ({
                activeTabId: id,
                tabs: state.tabs.map(t => t.id === id ? { ...t, lastAccessed: Date.now(), suspended: false } : t)
            })),

            suspendTab: (id: string) => set((state) => ({
                tabs: state.tabs.map(t => t.id === id && t.id !== state.activeTabId ? { ...t, suspended: true, status: 'ready' } : t)
            })),

            updateTab: (id, data) => set((state) => ({
                tabs: state.tabs.map(t => t.id === id ? { ...t, ...data } : t)
            })),

            triggerCommand: (type) => set({ activeCommand: { type, id: Date.now() } }),
            clearCommand: () => set({ activeCommand: undefined }),

            addHistory: (url, title) => set((state) => {
                // Avoid duplicates at top
                if (state.history[0]?.url === url) return state;
                const newHistory = [{
                    id: Math.random().toString(36),
                    url,
                    title,
                    timestamp: Date.now()
                }, ...state.history].slice(0, 1000);
                return { history: newHistory };
            }),

            removeHistoryItem: (id) => set((state) => ({
                history: state.history.filter(h => h.id !== id)
            })),

            clearHistory: () => set({ history: [] }),

            toggleBookmark: (url, title) => set((state) => {
                const exists = state.bookmarks.find(b => b.url === url);
                if (exists) {
                    return { bookmarks: state.bookmarks.filter(b => b.url !== url) };
                } else {
                    return {
                        bookmarks: [{
                            id: Math.random().toString(36),
                            url,
                            title,
                            tags: [],
                            timestamp: Date.now()
                        }, ...state.bookmarks]
                    };
                }
            }),

            updateBookmark: (url, title, tags) => set((state) => ({
                bookmarks: state.bookmarks.map(b => b.url === url ? { ...b, tags } : b)
            })),

            importBookmarks: (bookmarks) => set((state) => {
                const imported = bookmarks.filter(
                    (newBm) => !state.bookmarks.some(b => b.url === newBm.url)
                ).map((bm) => ({
                    id: Math.random().toString(36),
                    url: bm.url,
                    title: bm.title,
                    tags: [],
                    timestamp: Date.now()
                }));
                if (imported.length > 0) {
                    return { bookmarks: [...imported, ...state.bookmarks] };
                }
                return state;
            }),

            addPassword: (data) => set((state) => ({
                passwords: [{
                    id: Math.random().toString(36),
                    ...data,
                    createdAt: Date.now()
                }, ...state.passwords]
            })),

            removePassword: (id) => set((state) => ({
                passwords: state.passwords.filter(p => p.id !== id)
            })),

            updateDownload: (id, data) => set((state) => {
                const dlIndex = state.downloads.findIndex(d => d.id === id);
                if (dlIndex > -1) {
                    const updatedDownloads = [...state.downloads];
                    updatedDownloads[dlIndex] = { ...updatedDownloads[dlIndex], ...data };
                    return { downloads: updatedDownloads };
                } else if (data.filename && data.url) {
                    const newDownload = data as DownloadItem;
                    return { downloads: [newDownload, ...state.downloads] };
                }
                return state;
            }),

            setSetting: (key, value) => set((state) => ({
                settings: { ...state.settings, [key]: value }
            })),

            updateProfile: (data) => set((state) => ({
                profile: { ...state.profile, ...data }
            })),

            addBlockedItems: (id, items) => set((state) => {
                const tabIndex = state.tabs.findIndex(t => t.id === id);
                if (tabIndex === -1) return state;

                const currentTab = state.tabs[tabIndex];
                const stats = currentTab.blockedStats || {
                    ads: 0, trackers: 0, fingerprinters: 0, cryptominers: 0, social: 0, history: []
                };

                const newStats = { ...stats, history: [...stats.history] };

                items.forEach(item => {
                    if (item.type === 'Ad') newStats.ads++;
                    else if (item.type === 'Tracker') newStats.trackers++;
                    else if (item.type === 'Fingerprinter') newStats.fingerprinters++;
                    else if (item.type === 'Cryptominer') newStats.cryptominers++;
                    else if (item.type === 'Social') newStats.social++;

                    // Add to history (limit size to prevent bloating)
                    newStats.history.push({ url: item.url, domain: item.domain, type: item.type, timestamp: item.timestamp });
                    if (newStats.history.length > 50) newStats.history.shift();
                });

                const newTabs = [...state.tabs];
                newTabs[tabIndex] = { ...currentTab, blockedStats: newStats };

                return { tabs: newTabs };
            }),

            setToolbarLayout: (layout) => set({ toolbarLayout: layout }),
            toggleCustomizeToolbar: () => set((state) => ({ isCustomizingToolbar: !state.isCustomizingToolbar })),
            resetToolbarLayout: () => set({ toolbarLayout: ['back', 'forward', 'reload', 'urlbar', 'downloads', 'history', 'settings', 'incognito', 'profile'] }),

        }),
        {
            name: 'underlay-storage', // unique name
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                history: state.history,
                bookmarks: state.bookmarks,
                passwords: state.passwords,
                profile: state.profile,
                settings: state.settings,
                toolbarLayout: state.toolbarLayout,
                // Persist only non-incognito tabs
                tabs: state.tabs.filter(t => !t.incognito),
                activeTabId: state.tabs.some(t => !t.incognito && t.id === state.activeTabId) ? state.activeTabId : undefined
            }),
        }
    )
);

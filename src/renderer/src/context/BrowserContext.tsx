import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';

export type TabStatus = 'init' | 'loading' | 'ready' | 'crashed' | 'destroyed';

export interface Tab {
    id: string;
    url: string;
    title: string;
    status: TabStatus;
    pid?: number;
    incognito?: boolean;
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
    password: string; // Stored in plain text for prototype (mock secure)
    createdAt: number;
}

export interface UserProfile {
    name: string;
    email: string;
    avatar?: string;
    isAuthenticated: boolean;
}

interface BrowserState {
    tabs: Tab[];
    activeTabId: string;
    activeCommand?: { type: 'goBack' | 'goForward' | 'reload' | 'stop' | 'focusAddressBar' | 'toggleDevTools' | 'toggleHistory' | 'toggleSettings', id: number };
    history: HistoryEntry[];
    bookmarks: Bookmark[];
    passwords: Password[];
    downloads: DownloadItem[];
    settings: {
        lowPowerMode: boolean;
        theme: 'dark' | 'light' | 'system';
    };
    profile: UserProfile;
}

type Action =
    | { type: 'NEW_TAB'; payload?: { url?: string; incognito?: boolean } }
    | { type: 'CLOSE_TAB'; payload: { id: string } }
    | { type: 'SWITCH_TAB'; payload: { id: string } }
    | { type: 'UPDATE_TAB'; payload: { id: string; data: Partial<Tab> } }
    | { type: 'TRIGGER_COMMAND'; payload: 'goBack' | 'goForward' | 'reload' | 'stop' | 'focusAddressBar' | 'toggleDevTools' | 'toggleHistory' | 'toggleSettings' }
    | { type: 'CLEAR_COMMAND' }
    | { type: 'CLEAR_HISTORY' }
    | { type: 'ADD_HISTORY'; payload: { url: string; title: string } }
    | { type: 'TOGGLE_BOOKMARK'; payload: { url: string; title: string } }
    | { type: 'UPDATE_BOOKMARK'; payload: { url: string; title: string, tags: string[] } }
    | { type: 'ADD_PASSWORD'; payload: { url: string; username: string; password: string } }
    | { type: 'REMOVE_PASSWORD'; payload: { id: string } }
    | { type: 'IMPORT_BOOKMARKS'; payload: { bookmarks: Array<{ title: string, url: string }> } }
    | { type: 'UPDATE_DOWNLOAD'; payload: Partial<DownloadItem> & { id: string } }
    | { type: 'SET_SETTING'; payload: { key: string, value: any } }
    | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> };

const loadState = (): { history: HistoryEntry[], bookmarks: Bookmark[], passwords: Password[], profile: UserProfile, tabs: Tab[], activeTabId: string } => {
    try {
        const h = localStorage.getItem('underlay_history');
        const b = localStorage.getItem('underlay_bookmarks');
        const p = localStorage.getItem('underlay_passwords');
        const pr = localStorage.getItem('underlay_profile');
        const t = localStorage.getItem('underlay_tabs');
        const at = localStorage.getItem('underlay_active_tab');

        return {
            history: h ? JSON.parse(h) : [],
            bookmarks: b ? JSON.parse(b) : [],
            passwords: p ? JSON.parse(p) : [],
            profile: pr ? JSON.parse(pr) : { name: 'Guest', email: '', isAuthenticated: false },
            // Restore tabs if available, otherwise default to New Tab
            tabs: t ? JSON.parse(t) : [{ id: 'init', url: 'underlay://newtab', title: 'New Tab', status: 'ready' }],
            activeTabId: at || 'init'
        };
    } catch (e) {
        return {
            history: [], bookmarks: [], passwords: [], profile: { name: 'Guest', email: '', isAuthenticated: false },
            tabs: [{ id: 'init', url: 'underlay://newtab', title: 'New Tab', status: 'ready' }],
            activeTabId: 'init'
        };
    }
};

const persistentData = loadState();

const initialState: BrowserState = {
    tabs: persistentData.tabs,
    activeTabId: persistentData.activeTabId,
    history: persistentData.history,
    bookmarks: persistentData.bookmarks,
    passwords: persistentData.passwords,
    downloads: [],
    settings: { lowPowerMode: false, theme: 'dark' },
    profile: persistentData.profile
};

/**
 * Core State Reducer for the Browser.
 * Handles all logic for Tab Management, Navigation, History, and Settings.
 * This is a pure function that returns the new state based on the action.
 *
 * @param state Current Browser State
 * @param action Dispatched Action
 */
function browserReducer(state: BrowserState, action: Action): BrowserState {
    let newState = state;
    switch (action.type) {
        case 'TRIGGER_COMMAND':
            newState = { ...state, activeCommand: { type: action.payload, id: Date.now() } };
            break;
        case 'CLEAR_COMMAND':
            newState = { ...state, activeCommand: undefined };
            break;
        case 'NEW_TAB':
            const newId = Math.random().toString(36).substr(2, 9);
            const newTab: Tab = {
                id: newId,
                url: action.payload?.url || 'underlay://newtab',
                title: action.payload?.incognito ? 'New Incognito Tab' : 'New Tab',
                status: 'ready',
                incognito: action.payload?.incognito
            };
            newState = {
                ...state,
                tabs: [...state.tabs, newTab],
                activeTabId: newId,
            };
            break;
        case 'CLOSE_TAB':
            const filteredTabs = state.tabs.filter(t => t.id !== action.payload.id);
            if (filteredTabs.length === 0) {
                newState = { ...state, tabs: [], activeTabId: '' };
            } else {
                let newActiveId = state.activeTabId;
                if (state.activeTabId === action.payload.id) {
                    const index = state.tabs.findIndex(t => t.id === action.payload.id);
                    newActiveId = (state.tabs[index - 1] || state.tabs[index + 1] || filteredTabs[0]).id;
                }
                newState = { ...state, tabs: filteredTabs, activeTabId: newActiveId };
            }
            break;
        case 'SWITCH_TAB':
            newState = { ...state, activeTabId: action.payload.id };
            break;
        case 'UPDATE_TAB':
            newState = {
                ...state,
                tabs: state.tabs.map(t => t.id === action.payload.id ? { ...t, ...action.payload.data } : t)
            };
            break;
        case 'ADD_HISTORY':
            // Avoid duplicates at top of list
            if (state.history[0]?.url === action.payload.url) {
                newState = state;
            } else {
                const newHistory = [{
                    id: Math.random().toString(36),
                    url: action.payload.url,
                    title: action.payload.title,
                    timestamp: Date.now()
                }, ...state.history].slice(0, 1000); // Limit to 1000
                newState = { ...state, history: newHistory };
                // localStorage handled by effect
            }
            break;
        case 'CLEAR_HISTORY':
            newState = { ...state, history: [] };
            break;
        case 'TOGGLE_BOOKMARK':
            const exists = state.bookmarks.find(b => b.url === action.payload.url);
            let newBookmarks;
            if (exists) {
                newBookmarks = state.bookmarks.filter(b => b.url !== action.payload.url);
            } else {
                newBookmarks = [{
                    id: Math.random().toString(36),
                    url: action.payload.url,
                    title: action.payload.title,
                    tags: [], // Default empty tags
                    timestamp: Date.now()
                }, ...state.bookmarks];
            }
            newState = { ...state, bookmarks: newBookmarks };
            // localStorage handled by effect
            break;
        case 'ADD_PASSWORD':
            const newPassword: Password = {
                id: Math.random().toString(36),
                url: action.payload.url,
                username: action.payload.username,
                password: action.payload.password,
                createdAt: Date.now()
            };
            newState = { ...state, passwords: [newPassword, ...state.passwords] };
            break;
        case 'REMOVE_PASSWORD':
            newState = { ...state, passwords: state.passwords.filter(p => p.id !== action.payload.id) };
            break;
        case 'IMPORT_BOOKMARKS':
            const imported = action.payload.bookmarks.filter(
                (newBm: { url: string }) => !state.bookmarks.some(b => b.url === newBm.url)
            ).map((bm: { title: string, url: string }) => ({
                id: Math.random().toString(36),
                url: bm.url,
                title: bm.title,
                tags: [],
                timestamp: Date.now()
            }));

            if (imported.length > 0) {
                newState = { ...state, bookmarks: [...imported, ...state.bookmarks] };
            }
            break;
        case 'UPDATE_BOOKMARK':
            newState = {
                ...state,
                bookmarks: state.bookmarks.map(b => b.url === action.payload.url ? { ...b, tags: action.payload.tags } : b)
            };
            // localStorage handled by effect
            break;
        case 'SET_SETTING':
            newState = { ...state, settings: { ...state.settings, [action.payload.key]: action.payload.value } };
            break;
        case 'UPDATE_PROFILE':
            newState = { ...state, profile: { ...state.profile, ...action.payload } };
            break;
        case 'UPDATE_DOWNLOAD':
            const dlIndex = state.downloads.findIndex(d => d.id === action.payload.id);
            if (dlIndex > -1) {
                // Update existing
                const updatedDownloads = [...state.downloads];
                updatedDownloads[dlIndex] = { ...updatedDownloads[dlIndex], ...action.payload };
                newState = { ...state, downloads: updatedDownloads };
            } else {
                // Add new (if enough data provided)
                if (action.payload.filename && action.payload.url) {
                    // Safe cast because we check for required fields, but payload is technically Partial
                    const newDownload = action.payload as DownloadItem;
                    newState = { ...state, downloads: [newDownload, ...state.downloads] };
                } else {
                    newState = state; // Cannot add without details
                }
            }
            break;
    }
    return newState;
}

const BrowserContext = createContext<{ state: BrowserState; dispatch: React.Dispatch<Action> } | null>(null);

function dispatchTrace(layer: string, message: string) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('underlay-trace', { detail: { layer, message } }));
    }
}

function browserReducerWithTrace(state: BrowserState, action: Action): BrowserState {
    if (action.type === 'TRIGGER_COMMAND') {
        dispatchTrace('Controller', `Command: ${action.payload}`);
    } else if (action.type === 'NEW_TAB') {
        dispatchTrace('Controller', 'New Tab Created');
    } else if (action.type === 'SWITCH_TAB') {
        dispatchTrace('Controller', `Switch Tab: ${action.payload.id.substring(0, 4)}...`);
    } else if (action.type === 'UPDATE_TAB' && action.payload.data.url) {
        dispatchTrace('Controller', `Navigate: ${action.payload.data.url}`);
    } else if (action.type === 'TOGGLE_BOOKMARK') {
        dispatchTrace('UI', 'Bookmark Toggled');
    }

    return browserReducer(state, action);
}

export function BrowserProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(browserReducerWithTrace, initialState);

    // Debounced Storage Persistence
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem('underlay_history', JSON.stringify(state.history));
            localStorage.setItem('underlay_bookmarks', JSON.stringify(state.bookmarks));
            localStorage.setItem('underlay_passwords', JSON.stringify(state.passwords));
            localStorage.setItem('underlay_profile', JSON.stringify(state.profile));

            // Persist Tabs (Filter out incognito tabs for privacy)
            const persistableTabs = state.tabs.filter(t => !t.incognito);
            if (persistableTabs.length > 0) {
                localStorage.setItem('underlay_tabs', JSON.stringify(persistableTabs));
                // Ensure active tab is within persistable range, otherwise pick last
                const validActiveId = persistableTabs.find(t => t.id === state.activeTabId) ? state.activeTabId : persistableTabs[persistableTabs.length - 1].id;
                localStorage.setItem('underlay_active_tab', validActiveId);
            } else {
                // Fallback if all tabs closed or all incognito
                localStorage.removeItem('underlay_tabs');
                localStorage.removeItem('underlay_active_tab');
            }

        }, 1000); // 1-second debounce

        return () => clearTimeout(timer);
    }, [state.history, state.bookmarks, state.passwords, state.profile, state.tabs, state.activeTabId]);

    return (
        <BrowserContext.Provider value={{ state, dispatch }}>
            {children}
        </BrowserContext.Provider>
    );
}

export function useBrowser() {
    const context = useContext(BrowserContext);
    if (!context) throw new Error('useBrowser must be used within a BrowserProvider');
    return context;
}

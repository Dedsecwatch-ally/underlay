import React, { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useBrowserStore, BrowserState, Tab, HistoryEntry, Bookmark, DownloadItem, UserProfile, CommandType, Settings } from '../store/browserStore';

export type { Tab, HistoryEntry, Bookmark, DownloadItem, UserProfile };

export type Action =
    | { type: 'NEW_TAB'; payload?: { url?: string; incognito?: boolean; background?: boolean } }
    | { type: 'CLOSE_TAB'; payload: { id: string } }
    | { type: 'REOPEN_CLOSED_TAB' }
    | { type: 'SWITCH_TAB'; payload: { id: string } }
    | { type: 'UPDATE_TAB'; payload: { id: string; data: Partial<Tab> } }
    | { type: 'TRIGGER_COMMAND'; payload: CommandType }
    | { type: 'LOAD_URL'; payload: { id: string; url: string } }
    | { type: 'CLEAR_COMMAND' }
    | { type: 'CLEAR_HISTORY' }
    | { type: 'ADD_HISTORY'; payload: { url: string; title: string } }
    | { type: 'REMOVE_HISTORY_ITEM'; payload: { id: string } }
    | { type: 'TOGGLE_BOOKMARK'; payload: { url: string; title: string } }
    | { type: 'UPDATE_BOOKMARK'; payload: { url: string; title: string; tags: string[] } }
    | { type: 'IMPORT_BOOKMARKS'; payload: { bookmarks: Array<{ title: string; url: string }> } }
    | { type: 'UPDATE_DOWNLOAD'; payload: Partial<DownloadItem> & { id: string } }
    | { type: 'CLEAR_DOWNLOADS' }
    | { type: 'SET_SETTING'; payload: { key: keyof Settings; value: any } }
    | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
    | { type: 'SET_ACCOUNT'; payload: GoogleAccount | null }
    | { type: 'ADD_BLOCKED_ITEMS'; payload: { id: string; items: any[] } }
    | { type: 'SET_TOOLBAR_LAYOUT'; payload: string[] }
    | { type: 'TOGGLE_CUSTOMIZE_TOOLBAR' }
    | { type: 'RESET_TOOLBAR_LAYOUT' };

// Consumed by the introspection panel. Only a few low-frequency actions trace.
function trace(layer: string, message: string) {
    window.dispatchEvent(new CustomEvent('underlay-trace', { detail: { layer, message } }));
}

/** Stable for the lifetime of the app; safe to call from anywhere. */
export function dispatch(action: Action) {
    const store = useBrowserStore.getState();

    switch (action.type) {
        case 'NEW_TAB':
            trace('Controller', 'New Tab Created');
            return store.addTab(action.payload?.url, action.payload?.incognito, action.payload?.background);
        case 'CLOSE_TAB': return store.closeTab(action.payload.id);
        case 'REOPEN_CLOSED_TAB': return store.reopenClosedTab();
        case 'SWITCH_TAB': return store.switchTab(action.payload.id);
        case 'UPDATE_TAB': return store.updateTab(action.payload.id, action.payload.data);
        case 'TRIGGER_COMMAND':
            trace('Controller', `Command: ${action.payload}`);
            return store.triggerCommand(action.payload);
        case 'LOAD_URL':
            trace('Controller', `Load URL: ${action.payload.url}`);
            store.updateTab(action.payload.id, { url: action.payload.url, suspended: false });
            // Imperative navigation is delivered straight to the tab's webview.
            window.dispatchEvent(new CustomEvent('browser-load-url', { detail: action.payload }));
            return;
        case 'CLEAR_COMMAND': return store.clearCommand();
        case 'ADD_HISTORY': return store.addHistory(action.payload.url, action.payload.title);
        case 'REMOVE_HISTORY_ITEM': return store.removeHistoryItem(action.payload.id);
        case 'CLEAR_HISTORY': return store.clearHistory();
        case 'TOGGLE_BOOKMARK': return store.toggleBookmark(action.payload.url, action.payload.title);
        case 'UPDATE_BOOKMARK': return store.updateBookmark(action.payload.url, action.payload.title, action.payload.tags);
        case 'IMPORT_BOOKMARKS': return store.importBookmarks(action.payload.bookmarks);
        case 'UPDATE_DOWNLOAD': return store.updateDownload(action.payload.id, action.payload);
        case 'CLEAR_DOWNLOADS': return store.clearDownloads();
        case 'SET_SETTING': return store.setSetting(action.payload.key, action.payload.value);
        case 'UPDATE_PROFILE': return store.updateProfile(action.payload);
        case 'SET_ACCOUNT': return store.setAccount(action.payload);
        case 'ADD_BLOCKED_ITEMS': return store.addBlockedItems(action.payload.id, action.payload.items);
        case 'SET_TOOLBAR_LAYOUT': return store.setToolbarLayout(action.payload);
        case 'TOGGLE_CUSTOMIZE_TOOLBAR': return store.toggleCustomizeToolbar();
        case 'RESET_TOOLBAR_LAYOUT': return store.resetToolbarLayout();
    }
}

export function BrowserProvider({ children }: { children: ReactNode }) {
    return <>{children}</>;
}

/**
 * Subscribes to the whole store. Prefer `useBrowserState` with a selector in
 * anything that stays mounted. Pass `active = false` (e.g. for a closed
 * panel) to stop re-rendering on every store change.
 */
export function useBrowser(active = true) {
    const live = useBrowserStore(state => (active ? state : null));
    return { state: live ?? useBrowserStore.getState(), dispatch };
}

/** Re-renders only when the selected (shallowly compared) value changes. */
export function useBrowserState<T>(selector: (state: BrowserState) => T): T {
    return useBrowserStore(useShallow(selector));
}

export const useActiveTab = () => useBrowserStore(state => state.tabs.find(t => t.id === state.activeTabId));

export const getBrowserState = () => useBrowserStore.getState();

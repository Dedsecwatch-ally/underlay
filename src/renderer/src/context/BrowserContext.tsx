import React, { createContext, useContext, ReactNode } from 'react';
import { useBrowserStore, BrowserState, Tab, HistoryEntry, Bookmark, DownloadItem, Password, UserProfile } from '../store/browserStore';

// Re-export types for compatibility
export type { Tab, HistoryEntry, Bookmark, DownloadItem, Password, UserProfile };

// Action Types (kept for compatibility)
export type Action =
    | { type: 'NEW_TAB'; payload?: { url?: string; incognito?: boolean } }
    | { type: 'CLOSE_TAB'; payload: { id: string } }
    | { type: 'SWITCH_TAB'; payload: { id: string } }
    | { type: 'UPDATE_TAB'; payload: { id: string; data: Partial<Tab> } }
    | { type: 'TRIGGER_COMMAND'; payload: 'goBack' | 'goForward' | 'reload' | 'stop' | 'focusAddressBar' | 'toggleDevTools' | 'toggleHistory' | 'toggleSettings' | 'toggleDownloads' | 'toggleProfile' }
    | { type: 'LOAD_URL'; payload: { id: string; url: string } }
    | { type: 'CLEAR_COMMAND' }
    | { type: 'CLEAR_HISTORY' }
    | { type: 'ADD_HISTORY'; payload: { url: string; title: string } }
    | { type: 'REMOVE_HISTORY_ITEM'; payload: { id: string } }
    | { type: 'TOGGLE_BOOKMARK'; payload: { url: string; title: string } }
    | { type: 'UPDATE_BOOKMARK'; payload: { url: string; title: string, tags: string[] } }
    | { type: 'ADD_PASSWORD'; payload: { url: string; username: string; password: string } }
    | { type: 'REMOVE_PASSWORD'; payload: { id: string } }
    | { type: 'IMPORT_BOOKMARKS'; payload: { bookmarks: Array<{ title: string, url: string }> } }
    | { type: 'UPDATE_DOWNLOAD'; payload: Partial<DownloadItem> & { id: string } }
    | { type: 'SET_SETTING'; payload: { key: string, value: any } }
    | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
    | { type: 'ADD_BLOCKED_ITEMS'; payload: { id: string; items: any[] } }
    | { type: 'SET_TOOLBAR_LAYOUT'; payload: string[] }
    | { type: 'TOGGLE_CUSTOMIZE_TOOLBAR' }
    | { type: 'RESET_TOOLBAR_LAYOUT' };

// Dummy Context (not actually used for state, just for Provider strictness if needed)
const BrowserContext = createContext<any>(null);

function dispatchTrace(layer: string, message: string) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('underlay-trace', { detail: { layer, message } }));
    }
}

export function BrowserProvider({ children }: { children: ReactNode }) {
    return (
        <BrowserContext.Provider value={true}>
            {children}
        </BrowserContext.Provider>
    );
}

export function useBrowser() {
    const store = useBrowserStore();

    // Construct dispatch function that maps to store actions
    const dispatch = (action: Action) => {
        // Trace
        if (action.type === 'TRIGGER_COMMAND') {
            dispatchTrace('Controller', `Command: ${action.payload}`);
        } else if (action.type === 'NEW_TAB') {
            dispatchTrace('Controller', 'New Tab Created');
        } else if (action.type === 'SWITCH_TAB') {
            dispatchTrace('Controller', `Switch Tab: ${action.payload.id.substring(0, 4)}...`);
        } else if (action.type === 'UPDATE_TAB' && action.payload.data.url) {
            dispatchTrace('Controller', `Navigate (Passive): ${action.payload.data.url}`);
        } else if (action.type === 'LOAD_URL') {
            dispatchTrace('Controller', `Load URL: ${action.payload.url}`);
        } else if (action.type === 'TOGGLE_BOOKMARK') {
            dispatchTrace('UI', 'Bookmark Toggled');
        }

        // Execute
        switch (action.type) {
            case 'NEW_TAB':
                store.addTab(action.payload?.url, action.payload?.incognito);
                break;
            case 'CLOSE_TAB':
                store.closeTab(action.payload.id);
                break;
            case 'SWITCH_TAB':
                store.switchTab(action.payload.id);
                break;
            case 'UPDATE_TAB':
                store.updateTab(action.payload.id, action.payload.data);
                break;
            case 'TRIGGER_COMMAND':
                store.triggerCommand(action.payload);
                break;
            case 'LOAD_URL':
                // Update URL in store for UI
                store.updateTab(action.payload.id, { url: action.payload.url });
                // Trigger imperative navigation via command system (using a custom event or extended command)
                // For now, let's use a Custom Event to bypass the store state loop for the actual navigation trigger
                window.dispatchEvent(new CustomEvent('browser-load-url', { detail: { id: action.payload.id, url: action.payload.url } }));
                break;
            case 'CLEAR_COMMAND':
                store.clearCommand();
                break;
            case 'ADD_HISTORY':
                store.addHistory(action.payload.url, action.payload.title);
                break;
            case 'REMOVE_HISTORY_ITEM':
                store.removeHistoryItem(action.payload.id);
                break;
            case 'CLEAR_HISTORY':
                store.clearHistory();
                break;
            case 'TOGGLE_BOOKMARK':
                store.toggleBookmark(action.payload.url, action.payload.title);
                break;
            case 'UPDATE_BOOKMARK':
                store.updateBookmark(action.payload.url, action.payload.title, action.payload.tags);
                break;
            case 'IMPORT_BOOKMARKS':
                store.importBookmarks(action.payload.bookmarks);
                break;
            case 'ADD_PASSWORD':
                store.addPassword(action.payload);
                break;
            case 'REMOVE_PASSWORD':
                store.removePassword(action.payload.id);
                break;
            case 'UPDATE_DOWNLOAD':
                store.updateDownload(action.payload.id, action.payload);
                break;
            case 'SET_SETTING':
                store.setSetting(action.payload.key, action.payload.value);
                break;
            case 'UPDATE_PROFILE':
                store.updateProfile(action.payload);
                break;
            case 'ADD_BLOCKED_ITEMS':
                store.addBlockedItems(action.payload.id, action.payload.items);
                break;
            case 'SET_TOOLBAR_LAYOUT':
                store.setToolbarLayout(action.payload);
                break;
            case 'TOGGLE_CUSTOMIZE_TOOLBAR':
                store.toggleCustomizeToolbar();
                break;
            case 'RESET_TOOLBAR_LAYOUT':
                store.resetToolbarLayout();
                break;
        }
    };

    return { state: store, dispatch };
}

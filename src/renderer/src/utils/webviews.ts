// Live <webview> elements by tab, plus the main-process webContents id of
// each, so IPC events (blocked trackers, popups) can be routed to a tab in O(1).

const byTab = new Map<string, Electron.WebviewTag>();
const tabByContents = new Map<number, string>();

export const webviews = {
    register(tabId: string, webview: Electron.WebviewTag) {
        byTab.set(tabId, webview);
    },
    setContentsId(tabId: string, contentsId: number) {
        tabByContents.set(contentsId, tabId);
    },
    unregister(tabId: string) {
        byTab.delete(tabId);
        for (const [contentsId, id] of tabByContents) {
            if (id === tabId) tabByContents.delete(contentsId);
        }
    },
    get: (tabId: string) => byTab.get(tabId),
    tabForContents: (contentsId: number) => tabByContents.get(contentsId)
};

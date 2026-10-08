import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// The only bridge between the browser UI and the main process. It is loaded
// into the UI window only; web pages in <webview>s never get a preload.

type Listener<T> = (data: T) => void;

function subscribe<T = any>(channel: string, callback: Listener<T>) {
    const handler = (_event: IpcRendererEvent, data: T) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => {
        ipcRenderer.removeListener(channel, handler);
    };
}

const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);
const send = (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args);
const noopSubscription = () => () => { };

contextBridge.exposeInMainWorld('electron', {
    versions: { chrome: process.versions.chrome, electron: process.versions.electron, node: process.versions.node },
    platform: process.platform,

    onCommand: (callback: Listener<string>) => subscribe('ui:command', callback),
    onOpenTab: (callback: Listener<{ url: string; incognito: boolean; background: boolean }>) => subscribe('tabs:open', callback),
    onPowerModeChanged: (callback: Listener<{ isOnBattery: boolean }>) => subscribe('power:state-changed', callback),
    getPowerState: () => invoke('power:get-state'),
    onDownloadUpdate: (callback: Listener<any>) => subscribe('download:update', callback),

    // Developer introspection hooks. The main process does not stream these
    // yet; they are kept so the introspection panel degrades gracefully.
    onNetworkRequest: noopSubscription,
    onNetworkResponse: noopSubscription,
    onNetworkComplete: noopSubscription,
    onPerformanceUpdate: noopSubscription,
    onNetworkCDP: noopSubscription,
    toggleNetworkMonitoring: () => { },
    setBlockedPatterns: () => { },
    perfControl: {
        throttleCPU: () => { },
        throttleNetwork: () => { },
        freeze: () => { },
        gc: () => { }
    },
    devtools: {
        getDOM: async () => null,
        toggleFPS: () => { },
        togglePaintRects: () => { }
    },

    account: {
        get: () => invoke('account:get'),
        refresh: () => invoke('account:refresh'),
        signOut: () => invoke('account:sign-out'),
        getSignInUrl: () => invoke('account:sign-in-url'),
        onChanged: (callback: Listener<any>) => subscribe('account:changed', callback)
    },
    vault: {
        status: () => invoke('vault:status'),
        list: () => invoke('vault:list'),
        add: (credential: { url: string; username: string; password: string }) => invoke('vault:add', credential),
        remove: (id: string) => invoke('vault:remove', id),
        copy: (id: string) => invoke('vault:copy', id),
        importLegacy: (items: unknown[]) => invoke('vault:import-legacy', items)
    },
    security: {
        onPermissionRequest: (callback: Listener<any>) => subscribe('security:permission-request', callback),
        sendPermissionResponse: (id: number, allow: boolean) => send('security:response', { id, allow }),
        getPermissions: () => invoke('security:get-permissions'),
        revoke: (origin: string, kind?: string) => send('security:revoke', { origin, kind }),
        onSecurityStateChange: noopSubscription
    },
    privacy: {
        getPrefs: () => invoke('privacy:get-prefs'),
        setPrefs: (patch: Record<string, boolean>) => invoke('privacy:set-prefs', patch),
        clearData: (options: { cookies?: boolean; cache?: boolean }) => invoke('privacy:clear-data', options),
        clearIncognito: () => invoke('privacy:clear-incognito'),
        onTrackerBlockedBatch: (callback: Listener<any[]>) => subscribe('privacy:tracker-blocked-batch', callback),
        onTrackerBlocked: (callback: Listener<any>) => subscribe<any[]>('privacy:tracker-blocked-batch', batch => batch.forEach(callback)),
        onCookieDetected: noopSubscription,
        onFingerprintAttempt: noopSubscription,
        toggleShield: (active: boolean) => invoke('privacy:set-prefs', { shields: active })
    },
    ui: {
        onContextMenu: (callback: Listener<any>) => subscribe('ui:context-menu', callback)
    },
    extensions: {
        load: () => invoke('extension:load'),
        list: () => invoke('extension:list'),
        remove: (id: string) => invoke('extension:remove', id)
    },
    sync: {
        importBookmarks: (browser: 'chrome' | 'brave' | 'edge') => invoke('sync:import-bookmarks', browser)
    },
    shell: {
        showItem: (path: string) => send('shell:show-item', path),
        openExternal: (url: string) => invoke('shell:open-external', url)
    },
    downloads: {
        getPath: () => invoke('downloads:get-path')
    },
    search: {
        suggest: (query: string, engine?: string) => invoke('search:suggest', query, engine)
    },
    cpp: {
        getMessage: async () => 'Native engine active'
    },
    onboarding: {
        checkStatus: () => invoke('onboarding:get-status'),
        complete: () => send('onboarding:complete')
    },
    window: {
        minimize: () => send('window:minimize'),
        maximize: () => send('window:maximize'),
        close: () => send('window:close')
    }
});

contextBridge.exposeInMainWorld('underlay', {
    screenshot: {
        captureVisible: () => invoke('ui:capture-page')
    }
});

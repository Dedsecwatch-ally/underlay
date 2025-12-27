import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const isMobile = Capacitor.isNativePlatform();
export const isElectron = typeof window !== 'undefined' && !!window.electron;

// Definition needs to match strict window.electron if possible, 
// but here we just return a safe partial mock.
export const getPlatformElectron = () => {
    if (isMobile) {
        return {
            ipcRenderer: {
                send: (_channel: string, ..._args: any[]) => { console.log('Mock IPC send:', _channel, _args); },
                on: (_channel: string, _listener: any) => { console.log('Mock IPC on:', _channel); return { removeListener: () => { } } as any; },
                invoke: async (_channel: string, ..._args: any[]) => { console.log('Mock IPC invoke:', _channel); return null; },
                removeAllListeners: (_channel: string) => { console.log('Mock IPC removeAllListeners:', _channel); }
            },
            shell: {
                openExternal: async (url: string) => {
                    await Browser.open({ url });
                },
                showItem: async (_path: string) => { console.log('Show Item not supported on mobile'); }
            },
            dialog: {
                showOpenDialog: async () => { return { canceled: true, filePaths: [] }; }
            },
            onPerformanceUpdate: (_cb: any) => { return () => { }; },
            onDownloadUpdate: (_cb: any) => { return () => { }; },
            onNetworkCDP: (_cb: any) => { return () => { }; },
            setBlockedPatterns: (_patterns: any) => { },
            extensions: {
                list: async () => [],
                load: async () => { },
                remove: async () => { }
            },
            sync: {
                importBookmarks: async () => []
            },
            perfControl: {
                freeze: () => { },
                gc: () => { },
                throttleNetwork: () => { }
            },
            security: {
                getPermissions: async () => ({}),
                revoke: async () => { },
                onSecurityStateChange: (_cb: any) => { return () => { }; },
                onPermissionRequest: (_cb: any) => { return () => { }; },
                sendPermissionResponse: (_id: number, _allow: boolean) => { }
            },
            ui: {
                onContextMenu: (_cb: any) => { return () => { }; }
            }
        };
    }

    // On Desktop, window.electron should be defined via preload
    return window.electron;
};

// Helper for opening URLs
export const openExternalUrl = async (url: string) => {
    if (isMobile) {
        await Browser.open({ url });
    } else {
        window.electron.shell.openExternal(url);
    }
};

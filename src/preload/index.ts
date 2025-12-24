import { contextBridge } from 'electron';

// Expose safe APIs to the renderer
contextBridge.exposeInMainWorld('electron', {
    versions: process.versions,
    onNetworkRequest: (callback: (data: any) => void) => {
        const { ipcRenderer } = require('electron');
        const subscription = (_: any, data: any) => callback(data);
        ipcRenderer.on('network:request', subscription);
        return () => ipcRenderer.removeListener('network:request', subscription);
    },
    onNetworkResponse: (callback: (data: any) => void) => {
        const { ipcRenderer } = require('electron');
        const subscription = (_: any, data: any) => callback(data);
        ipcRenderer.on('network:response', subscription);
        return () => ipcRenderer.removeListener('network:response', subscription);
    },
    onNetworkComplete: (callback: (data: any) => void) => {
        const { ipcRenderer } = require('electron');
        const subscription = (_: any, data: any) => callback(data);
        ipcRenderer.on('network:complete', subscription);
        return () => ipcRenderer.removeListener('network:complete', subscription);
    },
    onPerformanceUpdate: (callback: (data: any) => void) => {
        const { ipcRenderer } = require('electron');
        const subscription = (_: any, data: any) => callback(data);
        ipcRenderer.on('performance:update', subscription);
        return () => ipcRenderer.removeListener('performance:update', subscription);
    },
    onDownloadUpdate: (callback: (data: any) => void) => {
        const { ipcRenderer } = require('electron');
        const subscription = (_: any, data: any) => callback(data);
        ipcRenderer.on('download:update', subscription);
        return () => ipcRenderer.removeListener('download:update', subscription);
    },
    onNetworkCDP: (callback: (data: any) => void) => {
        const { ipcRenderer } = require('electron');
        const subscription = (_: any, data: any) => callback(data);
        ipcRenderer.on('network:cdp', subscription);
        return () => ipcRenderer.removeListener('network:cdp', subscription);
    },
    setBlockedPatterns: (patterns: string[]) => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('network:block-url', patterns);
    },
    perfControl: {
        throttleCPU: (pid: number, rate: number) => require('electron').ipcRenderer.send('perf:throttle-cpu', { pid, rate }),
        throttleNetwork: (pid: number, profile: string) => require('electron').ipcRenderer.send('perf:throttle-network', { pid, profile }),
        freeze: (pid: number, frozen: boolean) => require('electron').ipcRenderer.send('perf:freeze', { pid, frozen }),
        gc: (pid: number) => require('electron').ipcRenderer.send('perf:gc', { pid })
    },
    security: {
        onPermissionRequest: (callback: (data: any) => void) => {
            const subscription = (_: any, data: any) => callback(data);
            require('electron').ipcRenderer.on('security:permission-request', subscription);
            return () => require('electron').ipcRenderer.removeListener('security:permission-request', subscription);
        },
        getPermissions: () => require('electron').ipcRenderer.invoke('security:get-permissions'),
        revoke: (origin: string, permission: string) => require('electron').ipcRenderer.send('security:revoke', { origin, permission }),
        onSecurityStateChange: (callback: (data: any) => void) => {
            const subscription = (_: any, data: any) => callback(data);
            require('electron').ipcRenderer.on('security:state-changed', subscription);
            return () => require('electron').ipcRenderer.removeListener('security:state-changed', subscription);
        }
    },
    privacy: {
        onTrackerBlocked: (callback: (data: any) => void) => {
            const subscription = (_: any, data: any) => callback(data);
            require('electron').ipcRenderer.on('privacy:tracker-blocked', subscription);
            return () => require('electron').ipcRenderer.removeListener('privacy:tracker-blocked', subscription);
        },
        onCookieDetected: (callback: (data: any) => void) => {
            const subscription = (_: any, data: any) => callback(data);
            require('electron').ipcRenderer.on('privacy:cookie-detected', subscription);
            return () => require('electron').ipcRenderer.removeListener('privacy:cookie-detected', subscription);
        },
        onFingerprintAttempt: (callback: (data: any) => void) => {
            const subscription = (_: any, data: any) => callback(data);
            require('electron').ipcRenderer.on('privacy:fingerprint-attempt', subscription);
            return () => require('electron').ipcRenderer.removeListener('privacy:fingerprint-attempt', subscription);
        },
        toggleShield: (active: boolean) => require('electron').ipcRenderer.send('privacy:toggle-shield', active)
    },
    devtools: {
        getDOM: () => require('electron').ipcRenderer.invoke('devtools:get-dom'),
        toggleFPS: (show: boolean) => require('electron').ipcRenderer.send('devtools:toggle-fps', show),
        togglePaintRects: (show: boolean) => require('electron').ipcRenderer.send('devtools:toggle-paint-rects', show)
    },
    extensions: {
        load: () => require('electron').ipcRenderer.invoke('extension:load'),
        list: () => require('electron').ipcRenderer.invoke('extension:list'),
        remove: (id: string) => require('electron').ipcRenderer.invoke('extension:remove', id)
    },
    sync: {
        importBookmarks: (browser: 'chrome' | 'brave' | 'edge') => require('electron').ipcRenderer.invoke('sync:import-bookmarks', browser)
    },
    shell: {
        showItem: (path: string) => require('electron').ipcRenderer.send('shell:show-item', path)
    }
});

// Injection for Fingerprint Detection (Happens in the webview context, this preload runs there too!)
// We need to overwrite prototypes.
try {
    const { ipcRenderer } = require('electron');
    // Canvas
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
        ipcRenderer.send('privacy:fingerprint-report', { type: 'Canvas', details: 'toDataURL restricted' });
        return originalToDataURL.apply(this, args);
    };

    // AudioContext (Basic check)
    // @ts-ignore
    if (window.AudioContext) {
        // @ts-ignore
        const originalCreateBuffer = window.AudioContext.prototype.createBuffer;
        // @ts-ignore
        window.AudioContext.prototype.createBuffer = function (...args) {
            ipcRenderer.send('privacy:fingerprint-report', { type: 'Audio', details: 'createBuffer accessed' });
            return originalCreateBuffer.apply(this, args);
        }
    }

    // Screen
    // We can't easily proxy screen properties as they are read-only on window, 
    // but usually they are accessed directly. 
} catch (e) { }

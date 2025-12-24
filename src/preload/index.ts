import { contextBridge } from 'electron';

// Expose safe APIs to the renderer
contextBridge.exposeInMainWorld('electron', {
    versions: process.versions,
    onNetworkRequest: (callback: (data: any) => void) => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('network:request', (_: any, data: any) => callback(data));
    },
    onNetworkResponse: (callback: (data: any) => void) => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('network:response', (_: any, data: any) => callback(data));
    },
    onNetworkComplete: (callback: (data: any) => void) => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('network:complete', (_: any, data: any) => callback(data));
    },
    onPerformanceUpdate: (callback: (data: any) => void) => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('performance:update', (_: any, data: any) => callback(data));
    },
    onDownloadUpdate: (callback: (data: any) => void) => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('download:update', (_: any, data: any) => callback(data));
    },
    onNetworkCDP: (callback: (data: any) => void) => {
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('network:cdp', (_: any, data: any) => callback(data));
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
            require('electron').ipcRenderer.on('security:permission-request', (_: any, data: any) => callback(data));
        },
        getPermissions: () => require('electron').ipcRenderer.invoke('security:get-permissions'),
        revoke: (origin: string, permission: string) => require('electron').ipcRenderer.send('security:revoke', { origin, permission }),
        onSecurityStateChange: (callback: (data: any) => void) => require('electron').ipcRenderer.on('security:state-changed', (_: any, data: any) => callback(data))
    },
    privacy: {
        onTrackerBlocked: (callback: (data: any) => void) => require('electron').ipcRenderer.on('privacy:tracker-blocked', (_: any, data: any) => callback(data)),
        onCookieDetected: (callback: (data: any) => void) => require('electron').ipcRenderer.on('privacy:cookie-detected', (_: any, data: any) => callback(data)),
        onFingerprintAttempt: (callback: (data: any) => void) => require('electron').ipcRenderer.on('privacy:fingerprint-attempt', (_: any, data: any) => callback(data)),
        toggleShield: (active: boolean) => require('electron').ipcRenderer.send('privacy:toggle-shield', active)
    },
    devtools: {
        getDOM: () => require('electron').ipcRenderer.invoke('devtools:get-dom'),
        toggleFPS: (show: boolean) => require('electron').ipcRenderer.send('devtools:toggle-fps', show),
        togglePaintRects: (show: boolean) => require('electron').ipcRenderer.send('devtools:toggle-paint-rects', show)
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

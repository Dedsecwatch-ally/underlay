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
    toggleNetworkMonitoring: (active: boolean) => {
        require('electron').ipcRenderer.send('network:toggle-monitoring', active);
    },
    onPowerModeChanged: (callback: (data: { isOnBattery: boolean }) => void) => {
        const { ipcRenderer } = require('electron');
        const subscription = (_: any, data: any) => callback(data);
        ipcRenderer.on('power:state-changed', subscription);
        return () => ipcRenderer.removeListener('power:state-changed', subscription);
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
        },
        sendPermissionResponse: (id: number, allow: boolean) => require('electron').ipcRenderer.send('security:response', { id, allow })
    },
    ui: {
        onContextMenu: (callback: (data: any) => void) => {
            const subscription = (_: any, data: any) => callback(data);
            require('electron').ipcRenderer.on('ui:context-menu', subscription);
            return () => require('electron').ipcRenderer.removeListener('ui:context-menu', subscription);
        }
    },
    privacy: {
        onTrackerBlocked: (callback: (data: any) => void) => {
            const subscription = (_: any, data: any) => callback(data);
            // handle batch by exploding it for legacy single listener
            const batchSub = (_: any, batch: any[]) => batch.forEach(data => callback(data));

            require('electron').ipcRenderer.on('privacy:tracker-blocked', subscription);
            require('electron').ipcRenderer.on('privacy:tracker-blocked-batch', batchSub);

            return () => {
                require('electron').ipcRenderer.removeListener('privacy:tracker-blocked', subscription);
                require('electron').ipcRenderer.removeListener('privacy:tracker-blocked-batch', batchSub);
            };
        },
        onTrackerBlockedBatch: (callback: (batch: any[]) => void) => {
            const subscription = (_: any, batch: any[]) => callback(batch);
            require('electron').ipcRenderer.on('privacy:tracker-blocked-batch', subscription);
            return () => require('electron').ipcRenderer.removeListener('privacy:tracker-blocked-batch', subscription);
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
        showItem: (path: string) => require('electron').ipcRenderer.send('shell:show-item', path),
        openExternal: (url: string) => require('electron').shell.openExternal(url)
    },
    search: {
        suggest: (query: string) => require('electron').ipcRenderer.invoke('search:suggest', query)
    },
    cpp: {
        getMessage: () => require('electron').ipcRenderer.invoke('get-cpp-message')
    },
    onboarding: {
        checkStatus: () => require('electron').ipcRenderer.invoke('onboarding:get-status'),
        complete: () => require('electron').ipcRenderer.send('onboarding:complete')
    },
    window: {
        minimize: () => require('electron').ipcRenderer.send('window:minimize'),
        maximize: () => require('electron').ipcRenderer.send('window:maximize'),
        close: () => require('electron').ipcRenderer.send('window:close')
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

// Firefox-style Picture-in-Picture Toggle Injection
window.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .underlay-pip-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 999999;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            padding: 5px 8px;
            cursor: pointer;
            font-family: sans-serif;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
        }
        .underlay-pip-btn.visible {
            opacity: 1;
            pointer-events: auto;
        }
        .underlay-pip-btn:hover {
            background: rgba(0, 0, 0, 0.9);
        }
    `;
    document.head.appendChild(style);

    let activeVideo: HTMLVideoElement | null = null;
    let pipBtn: HTMLDivElement | null = null;

    const createBtn = () => {
        const btn = document.createElement('div');
        btn.className = 'underlay-pip-btn';
        btn.innerText = 'PiP';
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (activeVideo) {
                if (document.pictureInPictureElement) {
                    document.exitPictureInPicture();
                } else {
                    activeVideo.requestPictureInPicture();
                }
            }
        };
        document.body.appendChild(btn);
        return btn;
    };

    document.addEventListener('mouseover', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'VIDEO') {
            activeVideo = target as HTMLVideoElement;
            if (!pipBtn) pipBtn = createBtn();

            const rect = activeVideo.getBoundingClientRect();
            // Basic positioning relative to viewport
            pipBtn.style.top = (window.scrollY + rect.top + 10) + 'px';
            pipBtn.style.left = (window.scrollX + rect.right - 50) + 'px';
            pipBtn.classList.add('visible');
        } else if (pipBtn && !target.classList.contains('underlay-pip-btn')) {
            // Logic to hide handled by mouseout below
        }
    }, true);

    document.addEventListener('mouseout', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'VIDEO' && pipBtn) {
            setTimeout(() => {
                if (!pipBtn?.matches(':hover')) {
                    pipBtn?.classList.remove('visible');
                }
            }, 500);
        }
    }, true);
});

contextBridge.exposeInMainWorld('underlay', {
    screenshot: {
        captureVisible: () => require('electron').ipcRenderer.invoke('ui:capture-page')
    }
});

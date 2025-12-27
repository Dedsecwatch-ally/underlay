/// <reference types="vite/client" />

declare namespace JSX {
    interface IntrinsicElements {
        webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { src?: string; allowpopups?: boolean; webpreferences?: string }, HTMLElement>;
    }
}

interface Window {
    electron: {
        versions: NodeJS.ProcessVersions;
        onNetworkRequest: (callback: (data: NetworkRequest) => void) => () => void;
        onNetworkResponse: (callback: (data: NetworkResponse) => void) => () => void;
        onNetworkComplete: (callback: (data: NetworkComplete) => void) => () => void;
        onPerformanceUpdate: (callback: (data: PerformanceData) => void) => () => void;
        onDownloadUpdate: (callback: (data: any) => void) => () => void;
        onNetworkCDP: (callback: (data: any) => void) => () => void;
        setBlockedPatterns: (patterns: string[]) => void;
        perfControl: {
            throttleCPU: (pid: number, rate: number) => void;
            throttleNetwork: (pid: number, profile: string) => void;
            freeze: (pid: number, frozen: boolean) => void;
            gc: (pid: number) => void;
        };
        security: {
            onPermissionRequest: (callback: (data: any) => void) => () => void;
            getPermissions: () => Promise<any[]>;
            revoke: (origin: string, permission: string) => void;
            onSecurityStateChange: (callback: (data: any) => void) => () => void;
            sendPermissionResponse: (id: number, allow: boolean) => void;
        };
        ui: {
            onContextMenu: (callback: (data: any) => void) => () => void;
        };
        privacy: {
            onTrackerBlocked: (callback: (data: any) => void) => () => void;
            onCookieDetected: (callback: (data: any) => void) => () => void;
            onFingerprintAttempt: (callback: (data: any) => void) => () => void;
            toggleShield: (active: boolean) => void;
        };
        devtools: {
            getDOM: () => Promise<any>;
            toggleFPS: (show: boolean) => void;
            togglePaintRects: (show: boolean) => void;
        };
        extensions: {
            load: () => Promise<{ id: string; name: string; version: string } | null>;
            list: () => Promise<Array<{ id: string; name: string; version: string }>>;
            remove: (id: string) => Promise<boolean>;
        };
        sync: {
            importBookmarks: (browser: 'chrome' | 'brave' | 'edge') => Promise<Array<{ title: string; url: string }>>;
        };
        search: {
            suggest: (query: string) => Promise<any>;
        };
        shell: {
            showItem: (path: string) => void;
            openExternal: (url: string) => Promise<void>;
        };
        cpp: {
            getMessage: () => Promise<string>;
        };
    }
}

interface NetworkRequest {
    id: number;
    url: string;
    method: string;
    type: string;
    timestamp: number;
    webContentsId: number;
}

interface NetworkResponse {
    id: number;
    statusCode: number;
    headers: Record<string, string[]>;
    timestamp: number;
}

interface NetworkComplete {
    id: number;
    statusCode: number;
    timestamp: number;
    duration: number;
}

interface PerformanceData {
    metrics: Electron.ProcessMetric[];
    processMap: { id: number; pid: number; type: string; url: string; }[];
}

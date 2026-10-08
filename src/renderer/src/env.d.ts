/// <reference types="vite/client" />

declare namespace JSX {
    interface IntrinsicElements {
        webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { src?: string; allowpopups?: boolean; webpreferences?: string; partition?: string }, HTMLElement>;
    }
}

interface GoogleAccount {
    email: string;
    name: string;
    avatar?: string;
}

interface CredentialSummary {
    id: string;
    url: string;
    username: string;
    createdAt: number;
}

type PermissionKind =
    | 'camera' | 'microphone' | 'geolocation' | 'notifications' | 'midi'
    | 'screen' | 'clipboard-read' | 'open-external' | 'idle-detection'
    | 'window-management' | 'storage-access';

interface PermissionPrompt {
    id: number;
    origin: string;
    kinds: PermissionKind[];
    externalUrl?: string;
    isApp: boolean;
}

interface PermissionRecord {
    origin: string;
    kind: PermissionKind;
    decision: 'granted' | 'denied';
    updatedAt: number;
}

interface PrivacyPrefs {
    shields: boolean;
    httpsUpgrade: boolean;
    globalPrivacyControl: boolean;
    searchSuggestions: boolean;
}

interface Window {
    electron: {
        versions: { chrome: string; electron: string; node: string };
        platform: string;
        onCommand: (callback: (command: string) => void) => () => void;
        onOpenTab: (callback: (data: { url: string; incognito: boolean; background: boolean }) => void) => () => void;
        onPowerModeChanged: (callback: (data: { isOnBattery: boolean }) => void) => () => void;
        getPowerState: () => Promise<{ isOnBattery: boolean }>;
        onNetworkRequest: (callback: (data: NetworkRequest) => void) => () => void;
        onNetworkResponse: (callback: (data: NetworkResponse) => void) => () => void;
        onNetworkComplete: (callback: (data: NetworkComplete) => void) => () => void;
        onPerformanceUpdate: (callback: (data: PerformanceData) => void) => () => void;
        onDownloadUpdate: (callback: (data: any) => void) => () => void;
        onNetworkCDP: (callback: (data: any) => void) => () => void;
        toggleNetworkMonitoring: (active: boolean) => void;
        setBlockedPatterns: (patterns: string[]) => void;
        perfControl: {
            throttleCPU: (pid: number, rate: number) => void;
            throttleNetwork: (pid: number, profile: string) => void;
            freeze: (pid: number, frozen: boolean) => void;
            gc: (pid: number) => void;
        };
        account: {
            get: () => Promise<GoogleAccount | null>;
            refresh: () => Promise<void>;
            signOut: () => Promise<void>;
            getSignInUrl: () => Promise<string>;
            onChanged: (callback: (account: GoogleAccount | null) => void) => () => void;
        };
        vault: {
            status: () => Promise<{ available: boolean; weak: boolean }>;
            list: () => Promise<CredentialSummary[]>;
            add: (credential: { url: string; username: string; password: string }) => Promise<CredentialSummary>;
            remove: (id: string) => Promise<void>;
            copy: (id: string) => Promise<boolean>;
            importLegacy: (items: unknown[]) => Promise<number>;
        };
        security: {
            onPermissionRequest: (callback: (data: PermissionPrompt) => void) => () => void;
            sendPermissionResponse: (id: number, allow: boolean) => void;
            getPermissions: () => Promise<PermissionRecord[]>;
            revoke: (origin: string, kind?: string) => void;
            onSecurityStateChange: (callback: (data: any) => void) => () => void;
        };
        ui: {
            onContextMenu: (callback: (data: any) => void) => () => void;
        };
        privacy: {
            getPrefs: () => Promise<PrivacyPrefs>;
            setPrefs: (patch: Partial<PrivacyPrefs>) => Promise<PrivacyPrefs>;
            clearData: (options: { cookies?: boolean; cache?: boolean }) => Promise<boolean>;
            clearIncognito: () => Promise<boolean>;
            onTrackerBlocked: (callback: (data: any) => void) => () => void;
            onTrackerBlockedBatch: (callback: (batch: any[]) => void) => () => void;
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
            suggest: (query: string, engine?: string) => Promise<string[]>;
        };
        shell: {
            showItem: (path: string) => void;
            openExternal: (url: string) => Promise<void>;
        };
        downloads: {
            getPath: () => Promise<string>;
        };
        cpp: {
            getMessage: () => Promise<string>;
        };
        onboarding: {
            checkStatus: () => Promise<boolean>;
            complete: () => void;
        };
        window: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
        };
    }

    // Separately exposed namespace
    underlay: {
        screenshot: {
            captureVisible: () => Promise<string>;
        };
    };
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

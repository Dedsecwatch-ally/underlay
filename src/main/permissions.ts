import { Session, WebContents } from 'electron';
import { store } from './store';

// Safari-style permission model: sensitive capabilities are asked for once
// per site and remembered, everything we don't understand is denied, and
// incognito decisions are kept in memory only.

export type PermissionKind =
    | 'camera' | 'microphone' | 'geolocation' | 'notifications' | 'midi'
    | 'screen' | 'clipboard-read' | 'open-external' | 'idle-detection'
    | 'window-management' | 'storage-access';

export interface PermissionRecord {
    origin: string;
    kind: PermissionKind;
    decision: 'granted' | 'denied';
    updatedAt: number;
}

export interface PermissionPrompt {
    id: number;
    origin: string;
    kinds: PermissionKind[];
    externalUrl?: string;
    isApp: boolean;
}

// Low-risk requests Chrome also grants without asking.
const ALWAYS_ALLOW = new Set(['fullscreen', 'clipboard-sanitized-write', 'pointerLock', 'mediaKeySystem', 'speaker-selection']);

const PROMPT_TIMEOUT_MS = 60_000;
// The browser UI is served from file:// (origin "null") in production, so
// its own requests are recorded under this stable name instead.
const APP_ORIGIN = 'underlay://app';
const STORE_KEY = 'permissions';

let nextPromptId = 1;
const pending = new Map<number, { finish: (allow: boolean, rememberDecision: boolean) => void; timer: NodeJS.Timeout }>();
const ephemeral = new Map<string, PermissionRecord>();

const recordKey = (origin: string, kind: PermissionKind) => `${origin} ${kind}`;

function readPersistent(): PermissionRecord[] {
    return store.get<PermissionRecord[]>(STORE_KEY, []);
}

function lookup(origin: string, kind: PermissionKind, persistent: boolean): PermissionRecord['decision'] | undefined {
    if (!persistent) return ephemeral.get(recordKey(origin, kind))?.decision;
    return readPersistent().find(r => r.origin === origin && r.kind === kind)?.decision;
}

function remember(origin: string, kinds: PermissionKind[], decision: PermissionRecord['decision'], persistent: boolean) {
    const now = Date.now();
    if (!persistent) {
        kinds.forEach(kind => ephemeral.set(recordKey(origin, kind), { origin, kind, decision, updatedAt: now }));
        return;
    }
    const records = readPersistent().filter(r => !(r.origin === origin && kinds.includes(r.kind)));
    kinds.forEach(kind => records.push({ origin, kind, decision, updatedAt: now }));
    store.set(STORE_KEY, records);
}

function originOf(url: string | undefined): string | null {
    if (!url) return null;
    try {
        const { origin } = new URL(url);
        return origin === 'null' ? null : origin;
    } catch {
        return null;
    }
}

function kindsFor(permission: string, details: any): PermissionKind[] | null {
    switch (permission) {
        case 'media': {
            const types: string[] = details?.mediaTypes ?? [];
            const kinds: PermissionKind[] = [];
            if (types.includes('video')) kinds.push('camera');
            if (types.includes('audio')) kinds.push('microphone');
            return kinds.length ? kinds : ['camera', 'microphone'];
        }
        case 'geolocation': return ['geolocation'];
        case 'notifications': return ['notifications'];
        case 'midi':
        case 'midiSysex': return ['midi'];
        case 'display-capture': return ['screen'];
        case 'clipboard-read': return ['clipboard-read'];
        case 'openExternal': return ['open-external'];
        case 'idle-detection': return ['idle-detection'];
        case 'window-management': return ['window-management'];
        case 'storage-access':
        case 'top-level-storage-access': return ['storage-access'];
        default: return null;
    }
}

interface PermissionOptions {
    persistent: boolean;
    /** The browser UI itself (e.g. the weather widget). */
    isApp?: (contents: WebContents | null) => boolean;
    prompt: (request: PermissionPrompt) => boolean;
}

export function installPermissionHandlers(ses: Session, options: PermissionOptions) {
    ses.setPermissionRequestHandler((contents, permission, callback, details: any) => {
        if (ALWAYS_ALLOW.has(permission)) return callback(true);

        const kinds = kindsFor(permission, details);
        const isApp = options.isApp?.(contents) ?? false;
        const origin = isApp ? APP_ORIGIN : originOf(details?.requestingUrl) ?? originOf(contents?.getURL());
        if (!kinds || !origin) return callback(false);

        const decisions = kinds.map(kind => lookup(origin, kind, options.persistent));
        // Opening another app is confirmed every time, like Safari.
        if (permission !== 'openExternal') {
            if (decisions.every(d => d === 'granted')) return callback(true);
            if (decisions.some(d => d === 'denied')) return callback(false);
        }

        const id = nextPromptId++;
        const timer = setTimeout(() => settle(id, false, false), PROMPT_TIMEOUT_MS);
        pending.set(id, {
            timer,
            finish: (allow, rememberDecision) => {
                if (rememberDecision && permission !== 'openExternal') {
                    remember(origin, kinds, allow ? 'granted' : 'denied', options.persistent);
                }
                callback(allow);
            }
        });

        const shown = options.prompt({
            id,
            origin,
            kinds,
            externalUrl: permission === 'openExternal' ? details?.externalURL : undefined,
            isApp
        });
        if (!shown) settle(id, false, false);
    });

    ses.setPermissionCheckHandler((contents, permission, requestingOrigin, details: any) => {
        if (ALWAYS_ALLOW.has(permission)) return true;
        const kinds = kindsFor(permission, { mediaTypes: details?.mediaType ? [details.mediaType] : undefined });
        const origin = options.isApp?.(contents) ? APP_ORIGIN : originOf(requestingOrigin);
        if (!kinds || !origin) return false;
        return kinds.every(kind => lookup(origin, kind, options.persistent) === 'granted');
    });
}

// A timeout or a prompt that couldn't be shown denies for now without
// remembering anything, so the site can ask again later.
function settle(id: number, allow: boolean, fromUser = true) {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    clearTimeout(entry.timer);
    entry.finish(allow, fromUser);
}

export const permissions = {
    respond(id: unknown, allow: unknown) {
        if (typeof id === 'number') settle(id, allow === true);
    },
    list(): PermissionRecord[] {
        return readPersistent().sort((a, b) => b.updatedAt - a.updatedAt);
    },
    revoke(origin: unknown, kind: unknown) {
        if (typeof origin !== 'string') return;
        store.set(STORE_KEY, readPersistent().filter(r => !(r.origin === origin && (kind === undefined || r.kind === kind))));
    },
    clearEphemeral() {
        ephemeral.clear();
    }
};

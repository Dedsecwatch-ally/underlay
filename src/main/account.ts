import { Session } from 'electron';
import { store } from './store';

// Google account state is derived from the browsing session itself: when the
// user signs in on accounts.google.com inside a tab, Google sets its auth
// cookies, we notice, and ask Google (the same way Chrome does) which
// account the session belongs to. Signing out removes those cookies, which
// really signs the session out of Gmail, YouTube, etc.

export interface GoogleAccount {
    email: string;
    name: string;
    avatar?: string; // data: URL, so the UI never has to hit Google itself
    /** Original photo URL, used to avoid re-downloading an unchanged avatar. */
    avatarSource?: string;
}

const AUTH_COOKIES = new Set(['SID', '__Secure-1PSID', '__Secure-3PSID']);
const GOOGLE_DOMAIN = /(^|\.)(google\.[a-z.]{2,6}|youtube\.com|googleusercontent\.com)$/i;
const LIST_ACCOUNTS_URL = 'https://accounts.google.com/ListAccounts?gpsia=1&source=ChromiumBrowser&json=standard';
const MAX_AVATAR_BYTES = 512 * 1024;
const STORE_KEY = 'account';

export const SIGN_IN_URL = 'https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fmyaccount.google.com%2F';

const bareDomain = (domain: string | undefined) => (domain ?? '').replace(/^\./, '');

export function createAccountManager(ses: Session, onChange: (account: GoogleAccount | null) => void) {
    let current = store.get<GoogleAccount | null>(STORE_KEY, null);
    let generation = 0;
    let debounce: NodeJS.Timeout | null = null;

    const publish = (account: GoogleAccount | null) => {
        const changed = JSON.stringify(account) !== JSON.stringify(current);
        current = account;
        if (changed) {
            store.set(STORE_KEY, account);
            onChange(account);
        }
    };

    async function hasAuthCookie(): Promise<boolean> {
        const cookies = await ses.cookies.get({ domain: 'google.com' });
        return cookies.some(c => AUTH_COOKIES.has(c.name));
    }

    async function fetchAvatar(url: string): Promise<string | undefined> {
        try {
            const res = await ses.fetch(url, { credentials: 'omit' });
            const type = res.headers.get('content-type') ?? '';
            if (!res.ok || !type.startsWith('image/')) return undefined;
            const buffer = Buffer.from(await res.arrayBuffer());
            if (buffer.length > MAX_AVATAR_BYTES) return undefined;
            return `data:${type.split(';')[0]};base64,${buffer.toString('base64')}`;
        } catch {
            return undefined;
        }
    }

    async function listAccounts(): Promise<GoogleAccount | null> {
        let res = await ses.fetch(LIST_ACCOUNTS_URL, { method: 'POST', body: ' ', credentials: 'include', cache: 'no-store' });
        if (!res.ok) res = await ses.fetch(LIST_ACCOUNTS_URL, { credentials: 'include', cache: 'no-store' });
        if (!res.ok) throw new Error(`ListAccounts returned ${res.status}`);

        const data = JSON.parse((await res.text()).replace(/^\)\]\}'\s*/, ''));
        const entries: unknown[] = Array.isArray(data?.[1]) ? data[1] : [];

        for (const entry of entries) {
            if (!Array.isArray(entry)) continue;
            const email = entry[3];
            if (typeof email !== 'string' || !email.includes('@')) continue;
            if (entry[14] === 1) continue; // listed, but signed out of this session
            const name = typeof entry[2] === 'string' && entry[2] ? entry[2] : email.split('@')[0];
            const photo = typeof entry[4] === 'string' && entry[4].startsWith('https://') ? entry[4] : undefined;
            const avatar = photo
                ? (photo === current?.avatarSource ? current.avatar : await fetchAvatar(photo))
                : undefined;
            return { email, name, avatar, avatarSource: photo };
        }
        return null;
    }

    async function refresh() {
        const run = ++generation;
        try {
            if (!(await hasAuthCookie())) {
                if (run === generation) publish(null);
                return;
            }
            const account = await listAccounts();
            if (run === generation) publish(account);
        } catch (e) {
            // Offline or Google changed something: keep what we had rather than
            // flickering the UI to "signed out" while the cookies are still there.
            console.warn('[Account] Refresh failed:', (e as Error).message);
        }
    }

    const scheduleRefresh = () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => {
            debounce = null;
            refresh();
        }, 600);
    };

    ses.cookies.on('changed', (_event, cookie) => {
        if (AUTH_COOKIES.has(cookie.name) && /(^|\.)google\.com$/.test(bareDomain(cookie.domain))) {
            scheduleRefresh();
        }
    });

    refresh();

    return {
        get: () => current ? { email: current.email, name: current.name, avatar: current.avatar } : null,
        refresh,

        async signOut() {
            const cookies = await ses.cookies.get({});
            await Promise.all(cookies
                .filter(c => GOOGLE_DOMAIN.test(bareDomain(c.domain)))
                .map(c => {
                    const url = `http${c.secure ? 's' : ''}://${bareDomain(c.domain)}${c.path ?? '/'}`;
                    return ses.cookies.remove(url, c.name).catch(() => { });
                }));
            await ses.cookies.flushStore();
            generation++;
            publish(null);
        }
    };
}


import { safeStorage, clipboard } from 'electron';
import { randomUUID } from 'crypto';
import { store } from './store';

// Passwords are encrypted with the OS keychain (Keychain on macOS, DPAPI on
// Windows, libsecret/kwallet on Linux) and never leave the main process in
// plain text. The renderer only ever sees site + username.

interface StoredCredential {
    id: string;
    url: string;
    username: string;
    secret: string; // base64 ciphertext from safeStorage
    createdAt: number;
}

export interface CredentialSummary {
    id: string;
    url: string;
    username: string;
    createdAt: number;
}

export interface NewCredential {
    url: string;
    username: string;
    password: string;
}

const STORE_KEY = 'vault';
const CLIPBOARD_CLEAR_MS = 30_000;
const MAX_FIELD_LENGTH = 2048;

let clipboardTimer: NodeJS.Timeout | null = null;

const read = () => store.get<StoredCredential[]>(STORE_KEY, []);
const write = (items: StoredCredential[]) => store.set(STORE_KEY, items);

const summarize = ({ id, url, username, createdAt }: StoredCredential): CredentialSummary => ({ id, url, username, createdAt });

function normalizeSite(input: string): string {
    const trimmed = input.trim();
    try {
        const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
        return parsed.origin;
    } catch {
        return trimmed;
    }
}

function isValidField(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= MAX_FIELD_LENGTH;
}

export const vault = {
    status() {
        const available = safeStorage.isEncryptionAvailable();
        // On Linux without a keyring, Chromium falls back to a hard-coded key.
        const weak = process.platform === 'linux' && available && safeStorage.getSelectedStorageBackend() === 'basic_text';
        return { available, weak };
    },

    list(): CredentialSummary[] {
        return read().map(summarize);
    },

    add(input: NewCredential): CredentialSummary {
        if (!isValidField(input?.url) || !isValidField(input?.username) || !isValidField(input?.password)) {
            throw new Error('Invalid credential');
        }
        if (!safeStorage.isEncryptionAvailable()) {
            throw new Error('Secure storage is not available on this system');
        }
        const item: StoredCredential = {
            id: randomUUID(),
            url: normalizeSite(input.url),
            username: input.username,
            secret: safeStorage.encryptString(input.password).toString('base64'),
            createdAt: Date.now()
        };
        write([item, ...read()]);
        return summarize(item);
    },

    remove(id: string) {
        write(read().filter(item => item.id !== id));
    },

    // Copies the password and wipes the clipboard again after 30s, unless the
    // user has copied something else in the meantime.
    copy(id: string): boolean {
        const item = read().find(c => c.id === id);
        if (!item) return false;
        const plain = safeStorage.decryptString(Buffer.from(item.secret, 'base64'));
        clipboard.writeText(plain);
        if (clipboardTimer) clearTimeout(clipboardTimer);
        clipboardTimer = setTimeout(() => {
            if (clipboard.readText() === plain) clipboard.clear();
            clipboardTimer = null;
        }, CLIPBOARD_CLEAR_MS);
        return true;
    },

    // One-time migration of the old plaintext list that lived in localStorage.
    importLegacy(items: NewCredential[]): number {
        if (!Array.isArray(items)) return 0;
        let imported = 0;
        for (const item of items) {
            try {
                vault.add(item);
                imported++;
            } catch (e) {
                console.warn('[Vault] Skipped legacy entry:', (e as Error).message);
            }
        }
        return imported;
    }
};

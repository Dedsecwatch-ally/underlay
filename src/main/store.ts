import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const filePath = path.join(app.getPath('userData'), 'config.json');

// Read once, serve from memory, and coalesce writes. Writes go to a temp file
// first and are renamed into place so a crash can never leave half a file.
let cache: Record<string, unknown> | null = null;
let writeTimer: NodeJS.Timeout | null = null;

function load(): Record<string, unknown> {
    if (cache) return cache;
    try {
        cache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
        cache = {};
    }
    return cache!;
}

function flush() {
    if (writeTimer) {
        clearTimeout(writeTimer);
        writeTimer = null;
    }
    if (!cache) return;
    try {
        const tmp = `${filePath}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(cache), { mode: 0o600 });
        fs.renameSync(tmp, filePath);
    } catch (e) {
        console.error('[Store] Failed to write config:', e);
    }
}

function scheduleWrite() {
    if (!writeTimer) writeTimer = setTimeout(flush, 250);
}

export const store = {
    get<T>(key: string, defaultValue: T): T {
        const value = load()[key];
        return value === undefined ? defaultValue : (value as T);
    },
    set(key: string, value: unknown) {
        load()[key] = value;
        scheduleWrite();
    },
    delete(key: string) {
        delete load()[key];
        scheduleWrite();
    },
    flush
};

app.on('will-quit', flush);

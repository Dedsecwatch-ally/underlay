import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, SlidersHorizontal, Search, Hand, KeyRound, Download, Puzzle, Info, ArrowDownToLine,
    Copy, Trash2, Check, Plus, Moon, Sun, Monitor, Lock, TriangleAlert
} from 'lucide-react';
import { dispatch, useBrowserState } from '../context/BrowserContext';
import { usePrivacyPrefs } from '../hooks/usePrivacyPrefs';
import { Switch } from './PrivacyShield';
import { SEARCH_ENGINES, SearchEngineId } from '../utils/omnibox';
import { isElectron } from '../utils/PlatformUtils';

type Pane = 'general' | 'search' | 'privacy' | 'passwords' | 'import' | 'extensions' | 'downloads' | 'about';

const PANES: Array<{ id: Pane; label: string; icon: React.ComponentType<{ size?: number }>; tint: string }> = [
    { id: 'general', label: 'General', icon: SlidersHorizontal, tint: 'bg-[#8e8e93]' },
    { id: 'search', label: 'Search', icon: Search, tint: 'bg-[#0a84ff]' },
    { id: 'privacy', label: 'Privacy & Security', icon: Hand, tint: 'bg-[#0a84ff]' },
    { id: 'passwords', label: 'Passwords', icon: KeyRound, tint: 'bg-[#8e8e93]' },
    { id: 'import', label: 'Import', icon: ArrowDownToLine, tint: 'bg-[#30d158]' },
    { id: 'extensions', label: 'Extensions', icon: Puzzle, tint: 'bg-[#5e5ce6]' },
    { id: 'downloads', label: 'Downloads', icon: Download, tint: 'bg-[#0a84ff]' },
    { id: 'about', label: 'About Underlay', icon: Info, tint: 'bg-[#8e8e93]' }
];

const PERMISSION_LABELS: Record<PermissionKind, string> = {
    camera: 'Camera',
    microphone: 'Microphone',
    geolocation: 'Location',
    notifications: 'Notifications',
    midi: 'MIDI devices',
    screen: 'Screen sharing',
    'clipboard-read': 'Clipboard',
    'open-external': 'Open apps',
    'idle-detection': 'Idle detection',
    'window-management': 'Window management',
    'storage-access': 'Cross-site cookies'
};

// ---------------------------------------------------------------------------
// Building blocks (inset grouped lists, like System Settings)
// ---------------------------------------------------------------------------

function Group({ title, footer, children }: { title?: string; footer?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="mb-6">
            {title && <h3 className="px-1 mb-1.5 text-[13px] font-semibold text-underlay-text/85">{title}</h3>}
            <div className="rounded-xl bg-underlay-text/[0.04] shadow-[inset_0_0_0_0.5px_var(--underlay-hairline)] divide-y divide-underlay-border overflow-hidden">
                {children}
            </div>
            {footer && <p className="px-1 mt-1.5 text-[11.5px] leading-snug text-underlay-text/50">{footer}</p>}
        </section>
    );
}

function Row({ label, description, children }: { label: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode }) {
    return (
        <div className="min-h-[44px] px-3.5 py-2 flex items-center justify-between gap-4">
            <div className="min-w-0">
                <div className="text-[13px] text-underlay-text">{label}</div>
                {description && <div className="text-[11.5px] leading-snug text-underlay-text/50 mt-0.5">{description}</div>}
            </div>
            <div className="shrink-0 flex items-center gap-2">{children}</div>
        </div>
    );
}

function Select<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<[T, string]>; label: string }) {
    return (
        <select
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value as T)}
            className="h-7 pl-2.5 pr-7 rounded-md text-[13px] bg-underlay-text/[0.08] hover:bg-underlay-text/[0.12] text-underlay-text outline-none appearance-none bg-no-repeat bg-[right_8px_center] bg-[length:10px]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23999' stroke-width='1.5'/%3E%3C/svg%3E\")" }}
        >
            {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
    );
}

function useAsync<T>(load: () => Promise<T>, deps: unknown[] = []) {
    const [value, setValue] = useState<T | null>(null);
    const [version, setVersion] = useState(0);
    useEffect(() => {
        let alive = true;
        load().then(v => alive && setValue(v)).catch(() => alive && setValue(null));
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [version, ...deps]);
    return [value, () => setVersion(v => v + 1)] as const;
}

// ---------------------------------------------------------------------------
// Panes
// ---------------------------------------------------------------------------

function GeneralPane({ onClose }: { onClose: () => void }) {
    const settings = useBrowserState(s => s.settings);
    const themes: Array<{ id: 'light' | 'dark' | 'system'; label: string; icon: React.ComponentType<{ size?: number }> }> = [
        { id: 'light', label: 'Light', icon: Sun },
        { id: 'dark', label: 'Dark', icon: Moon },
        { id: 'system', label: 'Auto', icon: Monitor }
    ];
    return (
        <>
            <Group title="Appearance">
                <div className="p-3 grid grid-cols-3 gap-2">
                    {themes.map(t => (
                        <button
                            key={t.id}
                            onClick={() => dispatch({ type: 'SET_SETTING', payload: { key: 'theme', value: t.id } })}
                            aria-pressed={settings.theme === t.id}
                            className={`h-16 rounded-lg flex flex-col items-center justify-center gap-1.5 text-[12px] transition-colors ${settings.theme === t.id
                                ? 'bg-underlay-accent/15 text-underlay-accent shadow-[inset_0_0_0_1.5px_rgb(var(--underlay-accent))]'
                                : 'bg-underlay-text/[0.05] text-underlay-text/70 hover:bg-underlay-text/[0.08]'}`}
                        >
                            <t.icon size={18} />
                            {t.label}
                        </button>
                    ))}
                </div>
            </Group>
            <Group footer="Turns off translucency effects and puts background tabs to sleep sooner, to save battery.">
                <Row label="Low Power Mode">
                    <Switch label="Low Power Mode" checked={settings.lowPowerMode} onChange={v => dispatch({ type: 'SET_SETTING', payload: { key: 'lowPowerMode', value: v } })} />
                </Row>
            </Group>
            <Group>
                <Row label="Toolbar" description="Rearrange the buttons in the toolbar.">
                    <button
                        className="btn-secondary h-7"
                        onClick={() => { dispatch({ type: 'TOGGLE_CUSTOMIZE_TOOLBAR' }); onClose(); }}
                    >
                        Customize…
                    </button>
                </Row>
            </Group>
        </>
    );
}

function SearchPane() {
    const engine = useBrowserState(s => s.settings.searchEngine);
    const [prefs, setPrefs] = usePrivacyPrefs();
    return (
        <Group footer="Suggestions send what you type to your search engine. They're never fetched in private tabs.">
            <Row label="Search engine">
                <Select
                    label="Search engine"
                    value={engine}
                    onChange={(value: SearchEngineId) => dispatch({ type: 'SET_SETTING', payload: { key: 'searchEngine', value } })}
                    options={Object.entries(SEARCH_ENGINES).map(([id, e]) => [id as SearchEngineId, e.name])}
                />
            </Row>
            <Row label="Include search engine suggestions">
                <Switch label="Search suggestions" checked={prefs.searchSuggestions} onChange={v => setPrefs({ searchSuggestions: v })} />
            </Row>
        </Group>
    );
}

function PrivacyPane() {
    const [prefs, setPrefs] = usePrivacyPrefs();
    const [permissions, reloadPermissions] = useAsync(() => window.electron.security.getPermissions());
    const [clearing, setClearing] = useState(false);

    return (
        <>
            <Group title="Tracking">
                <Row label="Block trackers and ads" description="Stops known trackers, ads, fingerprinters and cryptominers on every site.">
                    <Switch label="Shields" checked={prefs.shields} onChange={v => setPrefs({ shields: v })} />
                </Row>
                <Row label="Ask websites not to track me" description="Sends the Global Privacy Control signal, which is legally binding in some regions.">
                    <Switch label="Global Privacy Control" checked={prefs.globalPrivacyControl} onChange={v => setPrefs({ globalPrivacyControl: v })} />
                </Row>
            </Group>

            <Group title="Security">
                <Row label="Upgrade connections to HTTPS" description="Loads sites securely when possible, and falls back automatically if a site doesn't support it.">
                    <Switch label="HTTPS upgrades" checked={prefs.httpsUpgrade} onChange={v => setPrefs({ httpsUpgrade: v })} />
                </Row>
            </Group>

            <Group title="Website permissions" footer={permissions?.length ? undefined : 'Websites you allow or block from using your camera, location and more will appear here.'}>
                {permissions?.length ? permissions.map(p => (
                    <Row
                        key={`${p.origin}:${p.kind}`}
                        label={p.origin === 'underlay://app' ? 'Underlay start page' : p.origin.replace(/^https?:\/\//, '')}
                        description={PERMISSION_LABELS[p.kind] ?? p.kind}
                    >
                        <span className={`text-[12px] ${p.decision === 'granted' ? 'text-[#30d158]' : 'text-underlay-text/50'}`}>
                            {p.decision === 'granted' ? 'Allowed' : 'Blocked'}
                        </span>
                        <button
                            className="icon-button w-7 h-7"
                            aria-label={`Reset ${PERMISSION_LABELS[p.kind]} for ${p.origin}`}
                            title="Reset"
                            onClick={() => { window.electron.security.revoke(p.origin, p.kind); setTimeout(reloadPermissions, 50); }}
                        >
                            <X size={14} />
                        </button>
                    </Row>
                )) : <Row label={<span className="text-underlay-text/50">No websites</span>} />}
            </Group>

            <Group title="Browsing data">
                <Row label="Clear history, cookies and cache" description="Choose what to remove from this device.">
                    <button className="btn-secondary h-7" onClick={() => setClearing(true)}>Clear…</button>
                </Row>
            </Group>

            <AnimatePresence>{clearing && <ClearDataSheet onClose={() => setClearing(false)} />}</AnimatePresence>
        </>
    );
}

function ClearDataSheet({ onClose }: { onClose: () => void }) {
    const [options, setOptions] = useState({ history: true, cookies: false, cache: true, downloads: false });
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const items: Array<[keyof typeof options, string, string]> = [
        ['history', 'Browsing history', 'Pages you visited and recently closed tabs'],
        ['cookies', 'Cookies and website data', 'Signs you out of most websites, including Google'],
        ['cache', 'Cached images and files', 'Sites may load more slowly on your next visit'],
        ['downloads', 'Download list', 'Files you downloaded stay on disk']
    ];

    const clear = async () => {
        setBusy(true);
        try {
            if (options.history) dispatch({ type: 'CLEAR_HISTORY' });
            if (options.downloads) dispatch({ type: 'CLEAR_DOWNLOADS' });
            if (options.cookies || options.cache) await window.electron.privacy.clearData({ cookies: options.cookies, cache: options.cache });
            setDone(true);
            setTimeout(onClose, 900);
        } finally {
            setBusy(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-black/30 flex items-start justify-center pt-16" onClick={onClose}>
            <motion.div
                initial={{ y: -16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -16, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                className="sheet w-[380px] p-5"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-label="Clear browsing data"
            >
                <h2 className="text-[15px] font-semibold mb-3">Clear Browsing Data</h2>
                <div className="space-y-1">
                    {items.map(([key, label, hint]) => (
                        <label key={key} className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-underlay-text/[0.04] cursor-default">
                            <input
                                type="checkbox"
                                checked={options[key]}
                                onChange={e => setOptions(o => ({ ...o, [key]: e.target.checked }))}
                                className="mt-0.5 w-4 h-4 accent-[rgb(var(--underlay-accent))]"
                            />
                            <span>
                                <span className="block text-[13px]">{label}</span>
                                <span className="block text-[11.5px] text-underlay-text/50">{hint}</span>
                            </span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-destructive min-w-[96px]" disabled={busy || !Object.values(options).some(Boolean)} onClick={clear}>
                        {done ? <><Check size={14} /> Cleared</> : busy ? 'Clearing…' : 'Clear Data'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function PasswordsPane() {
    const [status] = useAsync(() => window.electron.vault.status());
    const [items, reload] = useAsync(() => window.electron.vault.list());
    const [form, setForm] = useState({ url: '', username: '', password: '' });
    const [error, setError] = useState('');
    const [copied, setCopied] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await window.electron.vault.add(form);
            setForm({ url: '', username: '', password: '' });
            reload();
        } catch (err) {
            setError((err as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
        }
    };

    const copy = async (id: string) => {
        if (await window.electron.vault.copy(id)) {
            setCopied(id);
            setTimeout(() => setCopied(c => (c === id ? null : c)), 2000);
        }
    };

    const visible = (items ?? []).filter(i => !filter || `${i.url} ${i.username}`.toLowerCase().includes(filter.toLowerCase()));

    return (
        <>
            {status && (
                <div className={`flex items-start gap-2.5 mb-5 p-3 rounded-xl text-[12px] leading-snug ${status.available && !status.weak ? 'bg-[#30d158]/10 text-underlay-text/75' : 'bg-[#ff9f0a]/12 text-underlay-text/80'}`}>
                    {status.available && !status.weak
                        ? <><Lock size={14} className="shrink-0 mt-px text-[#30d158]" /> Passwords are encrypted with your system keychain and never leave this device. Copied passwords are cleared from the clipboard after 30 seconds.</>
                        : <><TriangleAlert size={14} className="shrink-0 mt-px text-[#ff9f0a]" /> {status.available
                            ? 'No system keyring was found, so passwords are only obfuscated. Install and unlock GNOME Keyring or KWallet for real encryption.'
                            : 'Secure storage is unavailable on this system, so passwords can’t be saved.'}</>}
                </div>
            )}

            <Group title="Add a password">
                <form onSubmit={add} className="p-3 grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                    <input className="text-field h-8" placeholder="Website" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} aria-label="Website" />
                    <input className="text-field h-8" placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} aria-label="Username" autoComplete="off" />
                    <input className="text-field h-8" placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} aria-label="Password" autoComplete="new-password" />
                    <button className="btn-primary" disabled={!form.url || !form.username || !form.password || status?.available === false}>
                        <Plus size={14} /> Add
                    </button>
                </form>
                {error && <p className="px-3.5 pb-3 text-[12px] text-[#ff453a]">{error}</p>}
            </Group>

            <div className="flex items-center justify-between mb-1.5 px-1">
                <h3 className="text-[13px] font-semibold text-underlay-text/85">Saved passwords</h3>
                {!!items?.length && (
                    <input className="text-field h-7 w-48 text-[12px]" placeholder="Search" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Search passwords" />
                )}
            </div>
            <Group>
                {visible.length ? visible.map(item => (
                    <Row key={item.id} label={item.url.replace(/^https?:\/\//, '')} description={item.username}>
                        <button className="icon-button w-7 h-7" title="Copy password" aria-label={`Copy password for ${item.url}`} onClick={() => copy(item.id)}>
                            {copied === item.id ? <Check size={14} className="text-[#30d158]" /> : <Copy size={14} />}
                        </button>
                        <button
                            className="icon-button w-7 h-7 hover:!text-[#ff453a]"
                            title="Delete"
                            aria-label={`Delete password for ${item.url}`}
                            onClick={async () => { await window.electron.vault.remove(item.id); reload(); }}
                        >
                            <Trash2 size={14} />
                        </button>
                    </Row>
                )) : <Row label={<span className="text-underlay-text/50">{items?.length ? 'No matches' : 'No saved passwords'}</span>} />}
            </Group>
        </>
    );
}

function ImportPane() {
    const [status, setStatus] = useState<Record<string, string>>({});
    const browsers: Array<['chrome' | 'brave' | 'edge', string]> = [['chrome', 'Google Chrome'], ['brave', 'Brave'], ['edge', 'Microsoft Edge']];

    const run = async (browser: 'chrome' | 'brave' | 'edge') => {
        setStatus(s => ({ ...s, [browser]: 'Importing…' }));
        try {
            const bookmarks = await window.electron.sync.importBookmarks(browser);
            if (bookmarks.length) dispatch({ type: 'IMPORT_BOOKMARKS', payload: { bookmarks } });
            setStatus(s => ({ ...s, [browser]: bookmarks.length ? `Imported ${bookmarks.length}` : 'Nothing found' }));
        } catch {
            setStatus(s => ({ ...s, [browser]: 'Failed' }));
        }
    };

    return (
        <Group title="Bookmarks" footer="Imports bookmarks from the browser's default profile. Duplicates are skipped.">
            {browsers.map(([id, name]) => (
                <Row key={id} label={name}>
                    {status[id] && <span className="text-[12px] text-underlay-text/50">{status[id]}</span>}
                    <button className="btn-secondary h-7" disabled={status[id] === 'Importing…'} onClick={() => run(id)}>Import</button>
                </Row>
            ))}
        </Group>
    );
}

function ExtensionsPane() {
    const [extensions, reload] = useAsync(() => window.electron.extensions.list());
    const [error, setError] = useState('');

    const load = async () => {
        setError('');
        try {
            if (await window.electron.extensions.load()) reload();
        } catch (e) {
            setError((e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
        }
    };

    return (
        <>
            <Group
                title="Installed extensions"
                footer="Load an unpacked Chrome extension folder. Extensions can read and change the pages you visit, so only install ones you trust."
            >
                {extensions?.length ? extensions.map(ext => (
                    <Row key={ext.id} label={ext.name} description={`Version ${ext.version}`}>
                        <button className="btn-secondary h-7" onClick={async () => { await window.electron.extensions.remove(ext.id); reload(); }}>Remove</button>
                    </Row>
                )) : <Row label={<span className="text-underlay-text/50">No extensions installed</span>} />}
            </Group>
            <button className="btn-secondary" onClick={load}><Plus size={14} /> Load Unpacked Extension…</button>
            {error && <p className="mt-2 text-[12px] text-[#ff453a]">{error}</p>}
        </>
    );
}

function DownloadsPane() {
    const [path] = useAsync(() => window.electron.downloads.getPath());
    return (
        <Group footer="You'll be asked where to save each file, starting in this folder.">
            <Row label="Default download folder" description={<span className="font-mono">{path ?? '…'}</span>} />
        </Group>
    );
}

function AboutPane() {
    const versions = window.electron?.versions;
    return (
        <div className="flex flex-col items-center text-center pt-6">
            <div className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-[#5ac8fa] via-[#0a84ff] to-[#5e5ce6] flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(10,132,255,0.6)] mb-4">
                <span className="text-white text-4xl font-semibold tracking-tight">U</span>
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight">Underlay</h2>
            <p className="text-[12px] text-underlay-text/50 mt-1">Version 1.0.0</p>
            {versions && (
                <div className="mt-6 w-full max-w-xs">
                    <Group>
                        <Row label="Chromium"><span className="text-[12px] text-underlay-text/60 font-mono">{versions.chrome}</span></Row>
                        <Row label="Electron"><span className="text-[12px] text-underlay-text/60 font-mono">{versions.electron}</span></Row>
                    </Group>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------

export function SettingsOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [pane, setPane] = useState<Pane>('general');
    const current = PANES.find(p => p.id === pane)!;

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-[90] bg-black/35 flex items-center justify-center p-6"
                    onMouseDown={(e) => e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        initial={{ scale: 0.97, opacity: 0, y: 8 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.98, opacity: 0, transition: { duration: 0.12 } }}
                        transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
                        className="sheet relative w-full max-w-[860px] h-full max-h-[640px] flex overflow-hidden text-underlay-text"
                        role="dialog"
                        aria-label="Settings"
                    >
                        <nav className="w-[220px] shrink-0 bg-underlay-text/[0.03] border-r hairline p-2.5 overflow-y-auto">
                            <div className="h-8 mb-1 flex items-center px-2 text-[13px] font-semibold text-underlay-text/60">Settings</div>
                            {PANES.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setPane(p.id)}
                                    aria-current={pane === p.id ? 'page' : undefined}
                                    className={`w-full h-8 px-2 flex items-center gap-2.5 rounded-md text-[13px] ${pane === p.id ? 'bg-underlay-accent text-white' : 'text-underlay-text hover:bg-underlay-text/[0.06]'}`}
                                >
                                    <span className={`w-5 h-5 rounded-[5px] flex items-center justify-center text-white ${p.tint}`}>
                                        <p.icon size={12} />
                                    </span>
                                    {p.label}
                                </button>
                            ))}
                        </nav>

                        <div className="flex-1 min-w-0 flex flex-col">
                            <header className="h-12 shrink-0 flex items-center justify-between px-6 border-b hairline">
                                <h1 className="text-[15px] font-semibold tracking-tight">{current.label}</h1>
                                <button onClick={onClose} className="icon-button w-7 h-7" aria-label="Close settings"><X size={16} /></button>
                            </header>
                            <div className="flex-1 overflow-y-auto px-6 py-5">
                                {!isElectron && pane !== 'general' && pane !== 'search' ? (
                                    <p className="text-[13px] text-underlay-text/50">This setting is only available in the desktop app.</p>
                                ) : (
                                    <>
                                        {pane === 'general' && <GeneralPane onClose={onClose} />}
                                        {pane === 'search' && <SearchPane />}
                                        {pane === 'privacy' && <PrivacyPane />}
                                        {pane === 'passwords' && <PasswordsPane />}
                                        {pane === 'import' && <ImportPane />}
                                        {pane === 'extensions' && <ExtensionsPane />}
                                        {pane === 'downloads' && <DownloadsPane />}
                                        {pane === 'about' && <AboutPane />}
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

import React, { useState } from 'react';
import { useBrowser } from '../context/BrowserContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Settings, Monitor, Shield, Lock, Globe, Server, Cloud,
    Search, Puzzle, LayoutTemplate, Type, Download, Eye, Cpu,
    RotateCcw, Wallet, Smartphone, ChevronRight, ExternalLink, Book, Copy, Trash2, VenetianMask
} from 'lucide-react';
import classNames from 'classnames';

type SettingsTab =
    | 'get_started' | 'appearance' | 'content' | 'shields'
    | 'privacy' | 'web3' | 'sync' | 'search'
    | 'extensions' | 'autofill' | 'languages' | 'downloads'
    | 'accessibility' | 'system' | 'reset' | 'bookmarks';

const SettingSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="bg-[#1a1a1e] rounded-xl border border-white/5 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-white/90 font-medium tracking-wide text-sm uppercase opacity-70">{title}</h3>
        </div>
        <div className="p-0">
            {children}
        </div>
    </div>
);

const SettingRow = ({
    label,
    description,
    children,
    onClick,
    icon
}: {
    label: string,
    description?: string,
    children?: React.ReactNode,
    onClick?: () => void,
    icon?: React.ReactNode
}) => (
    <div
        onClick={onClick}
        className={classNames(
            "px-6 py-4 flex items-center justify-between border-b border-underlay-border last:border-0 transition-colors",
            onClick ? "cursor-pointer hover:bg-underlay-bg/50" : ""
        )}
    >
        <div className="flex items-center gap-4">
            {icon && <div className="text-underlay-text/40">{icon}</div>}
            <div className="flex flex-col gap-0.5">
                <span className="text-sm text-underlay-text/90">{label}</span>
                {description && <span className="text-xs text-underlay-text/50 max-w-lg">{description}</span>}
            </div>
        </div>
        <div className="flex items-center gap-2">{children}</div>
    </div>
);

const Toggle = ({ value, onChange }: { value: boolean, onChange: () => void }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onChange(); }}
        className={classNames(
            "w-11 h-6 rounded-full relative transition-all duration-300 shadow-inner",
            value ? "bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]" : "bg-zinc-800 border border-white/5"
        )}
    >
        <motion.div
            animate={{ x: value ? 22 : 2 }}
            className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-md"
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
    </button>
);

export function SettingsOverlay({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { state, dispatch } = useBrowser();
    const [activeTab, setActiveTab] = useState<SettingsTab>('get_started');

    // Local state for UI toggles that aren't yet in global state
    const [uiState, setUiState] = useState({
        showHome: true,
        showBookmarks: false,
        wideAddressBar: false,
        blockTrackers: true,
        bgPlay: false,
        askDownload: true,
        httpsOnly: true,
        autocomplete: true,
        checkSpelling: true
    });

    const toggleUi = (key: keyof typeof uiState) => {
        setUiState(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Extensions State
    const [extensions, setExtensions] = useState<Array<{ id: string, name: string, version: string }>>([]);

    React.useEffect(() => {
        if (isOpen && activeTab === 'extensions') {
            window.electron.extensions.list().then(setExtensions).catch(console.error);
        }
    }, [isOpen, activeTab]);

    const handleLoadExtension = async () => {
        try {
            const ext = await window.electron.extensions.load();
            if (ext) {
                setExtensions(prev => [...prev, ext]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleRemoveExtension = async (id: string) => {
        try {
            await window.electron.extensions.remove(id);
            setExtensions(prev => prev.filter(e => e.id !== id));
        } catch (e) {
            console.error(e);
        }
    };



    const MenuItems: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'get_started', label: 'Get started', icon: <Smartphone size={16} /> },
        { id: 'bookmarks', label: 'Bookmarks', icon: <Book size={16} /> },
        { id: 'shields', label: 'Shields', icon: <Shield size={16} /> },
        { id: 'privacy', label: 'Privacy and security', icon: <Lock size={16} /> },
        { id: 'sync', label: 'Sync', icon: <Cloud size={16} /> },
        { id: 'search', label: 'Search engine', icon: <Search size={16} /> },
        { id: 'extensions', label: 'Extensions', icon: <Puzzle size={16} /> },
        { id: 'autofill', label: 'Autofill and passwords', icon: <Type size={16} /> },
        { id: 'languages', label: 'Languages', icon: <Globe size={16} /> },
        { id: 'downloads', label: 'Downloads', icon: <Download size={16} /> },
        { id: 'system', label: 'System', icon: <Cpu size={16} /> },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-4 bg-underlay-surface border border-underlay-border rounded-xl overflow-hidden shadow-2xl z-50 flex flex-col"
                >
                    {/* Header */}
                    <div className="h-14 border-b border-underlay-border flex items-center justify-between px-6 bg-underlay-bg/50 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <h2 className="text-underlay-text font-medium text-lg">Settings</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-2.5 text-underlay-text/30" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search settings"
                                    className="w-full bg-underlay-bg border border-underlay-border rounded-md py-1.5 pl-10 pr-4 text-sm text-underlay-text focus:outline-none focus:border-underlay-accent/50 transition-colors"
                                />
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-underlay-bg rounded-full text-underlay-text/60 hover:text-underlay-text transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar */}
                        <div className="w-64 bg-underlay-surface border-r border-underlay-border flex flex-col overflow-y-auto py-4">
                            {MenuItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={classNames(
                                        "flex items-center gap-3 px-6 py-2.5 text-sm transition-colors relative",
                                        activeTab === item.id
                                            ? "text-underlay-accent bg-white/5 font-medium"
                                            : "text-white/70 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {activeTab === item.id && (
                                        <motion.div
                                            layoutId="active-indicator"
                                            className="absolute left-0 top-0 bottom-0 w-1 bg-underlay-accent"
                                        />
                                    )}
                                    <span className={activeTab === item.id ? "text-underlay-accent" : "opacity-70"}>{item.icon}</span>
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-12 bg-underlay-surface">
                            <div className="max-w-3xl mx-auto">
                                <h1 className="text-2xl font-bold text-white mb-8">{MenuItems.find(i => i.id === activeTab)?.label}</h1>

                                {activeTab === 'get_started' && (
                                    <div className="space-y-6">
                                        <SettingSection title="Profile">
                                            <SettingRow label="Profile name and icon" onClick={() => { }} >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
                                                    <span className="text-underlay-text/70 text-sm">Default</span>
                                                    <ChevronRight size={14} className="text-underlay-text/30" />
                                                </div>
                                            </SettingRow>
                                            <SettingRow label="Import bookmarks and settings" onClick={() => { }}>
                                                <ChevronRight size={14} className="text-underlay-text/30" />
                                            </SettingRow>
                                            <SettingRow
                                                label="New Incognito Tab"
                                                description="Browse without saving history"
                                                icon={<VenetianMask size={16} />}
                                                onClick={() => {
                                                    dispatch({ type: 'NEW_TAB', payload: { incognito: true } });
                                                    onClose();
                                                }}
                                            >
                                                <div className="w-2 h-2 bg-zinc-500 rounded-full"></div>
                                            </SettingRow>
                                        </SettingSection>
                                        <SettingSection title="Shortcuts">
                                            <SettingRow label="Open the New Tab page" description="On startup" onClick={() => { }}>
                                                <div className="w-2 h-2 bg-underlay-accent rounded-full"></div>
                                            </SettingRow>
                                            <SettingRow label="Continue where you left off" onClick={() => { }}>
                                                <div className="w-2 h-2 bg-underlay-text/20 rounded-full"></div>
                                            </SettingRow>
                                        </SettingSection>
                                    </div>
                                )}

                                {activeTab === 'appearance' && (
                                    <div className="space-y-6">

                                        <SettingSection title="Toolbar">
                                            <SettingRow label="Show Home button" description="Display the home button in the toolbar">
                                                <Toggle value={uiState.showHome} onChange={() => toggleUi('showHome')} />
                                            </SettingRow>
                                            <SettingRow label="Show Bookmarks bar" description="Always show bookmarks bar under the address bar">
                                                <Toggle value={uiState.showBookmarks} onChange={() => toggleUi('showBookmarks')} />
                                            </SettingRow>
                                            <SettingRow label="Use wide address bar" description="Expand address bar to fill available header space">
                                                <Toggle value={uiState.wideAddressBar} onChange={() => toggleUi('wideAddressBar')} />
                                            </SettingRow>
                                        </SettingSection>
                                    </div>
                                )}

                                {activeTab === 'shields' && (
                                    <div className="space-y-6">
                                        <SettingSection title="UnDerlay Shields">
                                            <SettingRow label="Trackers & ads blocking" description="Aggressive blocking of trackers and ads">
                                                <select className="bg-underlay-bg border border-underlay-border rounded px-2 py-1 text-sm text-underlay-text outline-none">
                                                    <option>Aggressive</option>
                                                    <option>Standard</option>
                                                    <option>Disabled</option>
                                                </select>
                                            </SettingRow>
                                            <SettingRow label="Block scripts" description="Block all JavaScript execution (may break sites)">
                                                <Toggle value={false} onChange={() => { }} />
                                            </SettingRow>
                                            <SettingRow label="Upgrade connections to HTTPS" description="Always attempt to use secure connections">
                                                <Toggle value={uiState.httpsOnly} onChange={() => toggleUi('httpsOnly')} />
                                            </SettingRow>
                                        </SettingSection>
                                    </div>
                                )}

                                {activeTab === 'privacy' && (
                                    <div className="space-y-6">
                                        <SettingSection title="Privacy">
                                            <SettingRow label="Clear browsing data" description="Clear history, cookies, cache, and more" onClick={() => { }}>
                                                <ChevronRight size={14} className="text-underlay-text/30" />
                                            </SettingRow>
                                            <SettingRow label="Cookies and other site data" onClick={() => { }}>
                                                <ChevronRight size={14} className="text-underlay-text/30" />
                                            </SettingRow>
                                            <SettingRow label="Security" description="Safe Browsing (protection from dangerous sites) and other security settings" onClick={() => { }}>
                                                <ChevronRight size={14} className="text-underlay-text/30" />
                                            </SettingRow>
                                        </SettingSection>
                                        <SettingSection title="Global Defaults">
                                            <SettingRow label="Location" onClick={() => { }}>
                                                <span className="text-xs text-underlay-text/50 mr-2">Ask before accessing</span>
                                                <ChevronRight size={14} className="text-underlay-text/30" />
                                            </SettingRow>
                                            <SettingRow label="Camera" onClick={() => { }}>
                                                <span className="text-xs text-underlay-text/50 mr-2">Ask before accessing</span>
                                                <ChevronRight size={14} className="text-underlay-text/30" />
                                            </SettingRow>
                                            <SettingRow label="Microphone" onClick={() => { }}>
                                                <span className="text-xs text-underlay-text/50 mr-2">Ask before accessing</span>
                                                <ChevronRight size={14} className="text-underlay-text/30" />
                                            </SettingRow>
                                        </SettingSection>
                                    </div>
                                )}

                                {activeTab === 'sync' && (
                                    <div className="space-y-6">
                                        <SettingSection title="Import Data">
                                            {['chrome', 'brave', 'edge'].map(browser => (
                                                <SettingRow
                                                    key={browser}
                                                    label={`Import from ${browser.charAt(0).toUpperCase() + browser.slice(1)}`}
                                                    description={`Import bookmarks from default ${browser.charAt(0).toUpperCase() + browser.slice(1)} profile`}
                                                    icon={<Cloud size={16} />}
                                                >
                                                    <button
                                                        onClick={async () => {
                                                            const btn = document.getElementById(`import-${browser}-btn`) as HTMLButtonElement;
                                                            if (btn) {
                                                                btn.disabled = true;
                                                                btn.innerText = 'Importing...';
                                                            }
                                                            try {
                                                                const bookmarks = await window.electron.sync.importBookmarks(browser as 'chrome' | 'brave' | 'edge');
                                                                if (bookmarks.length > 0) {
                                                                    dispatch({ type: 'IMPORT_BOOKMARKS', payload: { bookmarks } });
                                                                    if (btn) btn.innerText = `Imported ${bookmarks.length}`;
                                                                } else {
                                                                    if (btn) btn.innerText = 'No bookmarks';
                                                                }
                                                            } catch (e) {
                                                                console.error(e);
                                                                if (btn) btn.innerText = 'Failed';
                                                            }
                                                            setTimeout(() => {
                                                                if (btn) {
                                                                    btn.disabled = false;
                                                                    btn.innerText = 'Import';
                                                                }
                                                            }, 3000);
                                                        }}
                                                        id={`import-${browser}-btn`}
                                                        className="px-4 py-1.5 bg-underlay-accent hover:bg-underlay-accent/80 text-white rounded text-xs transition-colors font-medium disabled:opacity-50 min-w-[80px]"
                                                    >
                                                        Import
                                                    </button>
                                                </SettingRow>
                                            ))}
                                        </SettingSection>
                                        <SettingSection title="Sync Settings">
                                            <SettingRow label="Sync everything" description="Sync history, passwords, and settings across devices">
                                                <Toggle value={false} onChange={() => { }} />
                                            </SettingRow>
                                        </SettingSection>
                                    </div>
                                )}

                                {activeTab === 'search' && (
                                    <div className="space-y-6">
                                        <SettingSection title="Search Engine">
                                            <SettingRow label="Search engine used in the address bar" description="Sets the default search engine">
                                                <select className="bg-underlay-bg border border-underlay-border rounded px-2 py-1 text-sm text-underlay-text outline-none">
                                                    <option>Google</option>
                                                    <option>DuckDuckGo</option>
                                                    <option>Bing</option>
                                                    <option>Brave</option>
                                                    <option>Ecosia</option>
                                                </select>
                                            </SettingRow>
                                            <SettingRow label="Manage search engines" onClick={() => { }}>
                                                <ChevronRight size={14} className="text-underlay-text/30" />
                                            </SettingRow>
                                        </SettingSection>
                                    </div>
                                )}

                                {activeTab === 'autofill' && (
                                    <div className="space-y-6">
                                        <SettingSection title="Passwords">
                                            <div className="px-6 py-4 flex flex-col gap-4">
                                                <div className="flex gap-2">
                                                    <input id="pwd-url" placeholder="Website (e.g. google.com)" className="flex-1 bg-underlay-bg border border-underlay-border rounded px-3 py-2 text-sm text-underlay-text outline-none focus:border-underlay-accent/50" />
                                                    <input id="pwd-user" placeholder="Username" className="flex-1 bg-underlay-bg border border-underlay-border rounded px-3 py-2 text-sm text-underlay-text outline-none focus:border-underlay-accent/50" />
                                                    <input id="pwd-pass" type="password" placeholder="Password" className="flex-1 bg-underlay-bg border border-underlay-border rounded px-3 py-2 text-sm text-underlay-text outline-none focus:border-underlay-accent/50" />
                                                    <button
                                                        onClick={() => {
                                                            const urlFn = document.getElementById('pwd-url') as HTMLInputElement;
                                                            const userFn = document.getElementById('pwd-user') as HTMLInputElement;
                                                            const passFn = document.getElementById('pwd-pass') as HTMLInputElement;
                                                            if (urlFn.value && userFn.value && passFn.value) {
                                                                dispatch({ type: 'ADD_PASSWORD', payload: { url: urlFn.value, username: userFn.value, password: passFn.value } });
                                                                urlFn.value = '';
                                                                userFn.value = '';
                                                                passFn.value = '';
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-underlay-accent hover:bg-underlay-accent/80 text-white rounded text-sm transition-colors font-medium"
                                                    >
                                                        Save
                                                    </button>
                                                </div>

                                                <div className="mt-2 flex flex-col gap-2">
                                                    {state.passwords.length === 0 && (
                                                        <div className="text-center py-8 text-underlay-text/30 text-sm">
                                                            No passwords saved yet.
                                                        </div>
                                                    )}
                                                    {state.passwords.map(pwd => (
                                                        <div key={pwd.id} className="flex items-center justify-between p-3 bg-underlay-bg rounded border border-underlay-border group">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium text-underlay-text">{pwd.url}</span>
                                                                <span className="text-xs text-underlay-text/50">{pwd.username}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    className="p-1.5 hover:bg-white/10 rounded text-underlay-text/70 hover:text-white transition-colors"
                                                                    title="Copy Password"
                                                                    onClick={() => navigator.clipboard.writeText(pwd.password)}
                                                                >
                                                                    <Copy size={14} />
                                                                </button>
                                                                <button
                                                                    className="p-1.5 hover:bg-red-500/20 rounded text-underlay-text/70 hover:text-red-400 transition-colors"
                                                                    title="Delete"
                                                                    onClick={() => dispatch({ type: 'REMOVE_PASSWORD', payload: { id: pwd.id } })}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </SettingSection>
                                        <SettingSection title="Preferences">
                                            <SettingRow label="Offer to save passwords">
                                                <Toggle value={true} onChange={() => { }} />
                                            </SettingRow>
                                            <SettingRow label="Auto Sign-in">
                                                <Toggle value={true} onChange={() => { }} />
                                            </SettingRow>
                                        </SettingSection>
                                    </div>
                                )}

                                {activeTab === 'downloads' && (
                                    <div className="space-y-6">
                                        <SettingSection title="Downloads">
                                            <SettingRow label="Location" description="/Users/ayushmansingh/Downloads">
                                                <button className="px-3 py-1 bg-underlay-bg hover:bg-underlay-bg/80 rounded text-xs text-underlay-text transition-colors border border-underlay-border">Change</button>
                                            </SettingRow>
                                            <SettingRow label="Ask where to save each file before downloading" description="Always prompt for download location">
                                                <Toggle value={uiState.askDownload} onChange={() => toggleUi('askDownload')} />
                                            </SettingRow>
                                        </SettingSection>
                                    </div>
                                )}

                                {activeTab === 'languages' && (
                                    <div className="space-y-6">
                                        <SettingSection title="Preferred Languages">
                                            <SettingRow label="English (United States)" description="This language is used when translating pages">
                                                <div className="w-1 h-4 bg-underlay-text/10"></div>
                                            </SettingRow>
                                            <SettingRow label="Add languages" onClick={() => { }}>
                                                <span className="text-xs text-underlay-accent">Add</span>
                                            </SettingRow>
                                        </SettingSection>
                                        <SettingSection title="Spell Check">
                                            <SettingRow label="Check for spelling errors when you type text on web pages">
                                                <Toggle value={uiState.checkSpelling} onChange={() => toggleUi('checkSpelling')} />
                                            </SettingRow>
                                        </SettingSection>
                                    </div>
                                )}

                                {activeTab === 'bookmarks' && (
                                    <div className="space-y-6">
                                        <SettingSection title="Bookmarks">
                                            <SettingRow label="Show bookmarks bar" description="Show your favorite sites across the top of the browser window">
                                                <Toggle value={uiState.showBookmarks} onChange={() => toggleUi('showBookmarks')} />
                                            </SettingRow>
                                            <SettingRow
                                                label="Import bookmarks and settings"
                                                description="Import bookmarks from another browser"
                                                icon={<Download size={16} />}
                                                onClick={() => { }}
                                            />
                                        </SettingSection>
                                    </div>
                                )}

                                {activeTab === 'system' && (
                                    <div className="space-y-6">
                                        <SettingSection title="System Info">
                                            <SettingRow label="Hardware Acceleration" description="Use graphics acceleration when available">
                                                <Toggle value={true} onChange={() => { }} />
                                            </SettingRow>
                                            <SettingRow label="Open your computer's proxy settings" icon={<ExternalLink size={16} />} onClick={() => { }} />
                                        </SettingSection>
                                    </div>
                                )}

                                {activeTab === 'reset' && (
                                    <div className="space-y-6">
                                        <SettingSection title="Reset">
                                            <SettingRow label="Restore settings to their original defaults" onClick={() => { }}>
                                                <ChevronRight size={14} className="text-underlay-text/30" />
                                            </SettingRow>
                                        </SettingSection>
                                    </div>
                                )}

                                {/* Fallback for unimplemented tabs */}
                                {!['get_started', 'bookmarks', 'appearance', 'shields', 'privacy', 'search', 'downloads', 'languages', 'system', 'reset', 'extensions'].includes(activeTab) && (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                        <Settings size={64} className="mb-4 text-underlay-text/20" />
                                        <p className="text-underlay-text/40">This section is not implemented yet.</p>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, VenetianMask, RotateCcw, X, Clock, Settings, ArrowDownToLine, User, Globe, AppWindow, Library, Star } from 'lucide-react';
import { dispatch, useBrowser } from '../context/BrowserContext';
import { resolveInput, looksLikeUrl, displayUrl, SEARCH_ENGINES } from '../utils/omnibox';
import { shortcut } from '../utils/PlatformUtils';
import { NEW_TAB_URL } from '../store/browserStore';

interface Item {
    id: string;
    label: string;
    detail?: string;
    icon: React.ReactNode;
    shortcut?: string;
    run: () => void;
}

/** Spotlight-style launcher: commands, open tabs, bookmarks, or a URL/search. */
export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { state } = useBrowser(isOpen);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelected(0);
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [isOpen]);

    const items = useMemo<Item[]>(() => {
        const activeId = state.activeTabId;
        const commands: Item[] = [
            { id: 'new-tab', label: 'New Tab', icon: <Plus size={15} />, shortcut: shortcut('T'), run: () => dispatch({ type: 'NEW_TAB' }) },
            { id: 'private', label: 'New Private Tab', icon: <VenetianMask size={15} />, shortcut: shortcut('Shift', 'N'), run: () => dispatch({ type: 'NEW_TAB', payload: { incognito: true } }) },
            { id: 'reopen', label: 'Reopen Closed Tab', icon: <RotateCcw size={15} />, shortcut: shortcut('Shift', 'T'), run: () => dispatch({ type: 'REOPEN_CLOSED_TAB' }) },
            { id: 'close', label: 'Close Tab', icon: <X size={15} />, shortcut: shortcut('W'), run: () => activeId && dispatch({ type: 'CLOSE_TAB', payload: { id: activeId } }) },
            { id: 'history', label: 'Show History', icon: <Clock size={15} />, run: () => dispatch({ type: 'TRIGGER_COMMAND', payload: 'toggleHistory' }) },
            { id: 'library', label: 'Open Library', icon: <Library size={15} />, shortcut: shortcut('Shift', 'O'), run: () => dispatch({ type: 'NEW_TAB', payload: { url: 'underlay://library?view=history' } }) },
            { id: 'downloads', label: 'Show Downloads', icon: <ArrowDownToLine size={15} />, run: () => dispatch({ type: 'TRIGGER_COMMAND', payload: 'toggleDownloads' }) },
            { id: 'profile', label: 'Profile & Account', icon: <User size={15} />, run: () => dispatch({ type: 'TRIGGER_COMMAND', payload: 'toggleProfile' }) },
            { id: 'settings', label: 'Settings', icon: <Settings size={15} />, shortcut: shortcut(','), run: () => dispatch({ type: 'TRIGGER_COMMAND', payload: 'toggleSettings' }) }
        ];
        const q = query.trim().toLowerCase();
        if (!q) return commands;

        const results: Item[] = [];
        const target = resolveInput(query, state.settings.searchEngine);
        if (target) {
            results.push({
                id: 'go',
                label: looksLikeUrl(query) ? `Open ${query.trim()}` : `Search ${SEARCH_ENGINES[state.settings.searchEngine]?.name ?? 'Google'} for “${query.trim()}”`,
                icon: looksLikeUrl(query) ? <Globe size={15} /> : <Search size={15} />,
                run: () => dispatch({ type: 'NEW_TAB', payload: { url: target } })
            });
        }
        results.push(...commands.filter(c => c.label.toLowerCase().includes(q)));
        for (const tab of state.tabs) {
            if (tab.url === NEW_TAB_URL) continue;
            if (`${tab.title} ${tab.url}`.toLowerCase().includes(q)) {
                results.push({
                    id: `tab:${tab.id}`,
                    label: tab.title || displayUrl(tab.url),
                    detail: 'Switch to Tab',
                    icon: tab.favicon ? <img src={tab.favicon} alt="" className="w-[15px] h-[15px] rounded-[3px]" /> : <AppWindow size={15} />,
                    run: () => dispatch({ type: 'SWITCH_TAB', payload: { id: tab.id } })
                });
            }
        }
        for (const bookmark of state.bookmarks) {
            if (results.length > 12) break;
            if (`${bookmark.title} ${bookmark.url}`.toLowerCase().includes(q)) {
                results.push({
                    id: `bm:${bookmark.id}`,
                    label: bookmark.title || displayUrl(bookmark.url),
                    detail: displayUrl(bookmark.url),
                    icon: <Star size={15} />,
                    run: () => dispatch({ type: 'NEW_TAB', payload: { url: bookmark.url } })
                });
            }
        }
        return results;
    }, [query, state.tabs, state.bookmarks, state.activeTabId, state.settings.searchEngine]);

    useEffect(() => setSelected(0), [query]);
    useEffect(() => {
        listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    }, [selected]);

    const run = (item: Item | undefined) => {
        if (!item) return;
        onClose();
        item.run();
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelected(i => Math.min(i + 1, items.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelected(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            run(items[selected]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-start justify-center pt-[16vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
                        transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                        className="popover w-[600px] max-w-[90vw] overflow-hidden text-underlay-text"
                        role="dialog"
                        aria-label="Command palette"
                    >
                        <div className="flex items-center gap-3 px-4 h-14 border-b hairline">
                            <Search size={20} className="text-underlay-text/40 shrink-0" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={onKeyDown}
                                placeholder="Search tabs, bookmarks and commands, or enter an address"
                                className="flex-1 bg-transparent outline-none text-[18px] font-light placeholder:text-underlay-text/30"
                                spellCheck={false}
                                aria-label="Command"
                            />
                        </div>
                        <div ref={listRef} className="max-h-[360px] overflow-y-auto p-1.5" role="listbox">
                            {items.length === 0 && <div className="py-8 text-center text-[13px] text-underlay-text/40">No results</div>}
                            {items.map((item, i) => (
                                <div
                                    key={item.id}
                                    role="option"
                                    aria-selected={i === selected}
                                    onMouseMove={() => setSelected(i)}
                                    onClick={() => run(item)}
                                    className={`h-9 px-3 flex items-center gap-3 rounded-lg text-[13px] ${i === selected ? 'bg-underlay-accent text-white' : ''}`}
                                >
                                    <span className={i === selected ? 'text-white' : 'text-underlay-text/55'}>{item.icon}</span>
                                    <span className="truncate">{item.label}</span>
                                    {item.detail && <span className={`truncate text-[12px] ${i === selected ? 'text-white/70' : 'text-underlay-text/40'}`}>{item.detail}</span>}
                                    <span className="flex-1" />
                                    {item.shortcut && <kbd className={`font-sans text-[12px] ${i === selected ? 'text-white/80' : 'text-underlay-text/40'}`}>{item.shortcut}</kbd>}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

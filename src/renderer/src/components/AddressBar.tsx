import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, Star, BookOpen, Lock, VenetianMask, Globe, Clock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { dispatch, useBrowserState, getBrowserState } from '../context/BrowserContext';
import { NEW_TAB_URL } from '../store/browserStore';
import { PrivacyShield } from './PrivacyShield';
import { usePrivacyPrefs } from '../hooks/usePrivacyPrefs';
import { displayUrl, looksLikeUrl, resolveInput, SEARCH_ENGINES, searchUrl, useSuggestions } from '../utils/omnibox';

interface Suggestion {
    kind: 'navigate' | 'search' | 'history' | 'bookmark';
    label: string;
    detail?: string;
    url: string;
}

export function AddressBar() {
    const { tab, isBookmarked, searchEngine, command } = useBrowserState(s => {
        const active = s.tabs.find(t => t.id === s.activeTabId);
        return {
            tab: active,
            isBookmarked: !!active && s.bookmarks.some(b => b.url === active.url),
            searchEngine: s.settings.searchEngine,
            command: s.activeCommand?.type === 'focusAddressBar' ? s.activeCommand.id : undefined
        };
    });
    const [prefs, setPrefs] = usePrivacyPrefs();

    const inputRef = useRef<HTMLInputElement>(null);
    const [focused, setFocused] = useState(false);
    const [text, setText] = useState('');
    const [edited, setEdited] = useState(false);
    const [selected, setSelected] = useState(0);
    const [showSiteInfo, setShowSiteInfo] = useState(false);

    const url = tab?.url ?? '';
    const isNewTab = url === NEW_TAB_URL;
    const isWeb = /^https?:/.test(url);
    const isLoading = tab?.status === 'loading';
    const blocked = tab?.blockedStats
        ? tab.blockedStats.ads + tab.blockedStats.trackers + tab.blockedStats.fingerprinters + tab.blockedStats.cryptominers + tab.blockedStats.social
        : 0;

    // Show the page URL whenever the user isn't editing.
    useEffect(() => {
        if (!edited) setText(isNewTab ? '' : url);
    }, [url, isNewTab, edited, tab?.id]);

    useEffect(() => {
        setEdited(false);
        setShowSiteInfo(false);
    }, [tab?.id]);

    // ⌘L / "Open Location…"
    useEffect(() => {
        if (command === undefined) return;
        inputRef.current?.focus();
        inputRef.current?.select();
        dispatch({ type: 'CLEAR_COMMAND' });
    }, [command]);

    const query = edited ? text : '';
    const remote = useSuggestions(query, searchEngine, focused && !tab?.incognito && prefs.searchSuggestions);

    const suggestions = useMemo<Suggestion[]>(() => {
        const q = query.trim();
        if (!q) return [];
        const list: Suggestion[] = [];
        const engine = SEARCH_ENGINES[searchEngine]?.name ?? 'Google';

        if (looksLikeUrl(q)) list.push({ kind: 'navigate', label: q, url: resolveInput(q, searchEngine)! });
        list.push({ kind: 'search', label: q, detail: `${engine} Search`, url: searchUrl(q, searchEngine) });

        // Matching bookmarks and history, best first, read on demand.
        const needle = q.toLowerCase();
        const { bookmarks, history } = getBrowserState();
        const seen = new Set<string>();
        const local: Suggestion[] = [];
        for (const b of bookmarks) {
            if (local.length >= 2) break;
            if ((b.title.toLowerCase().includes(needle) || b.url.toLowerCase().includes(needle)) && !seen.has(b.url)) {
                seen.add(b.url);
                local.push({ kind: 'bookmark', label: b.title || displayUrl(b.url), detail: displayUrl(b.url), url: b.url });
            }
        }
        for (const h of history) {
            if (local.length >= 4) break;
            if ((h.title.toLowerCase().includes(needle) || h.url.toLowerCase().includes(needle)) && !seen.has(h.url)) {
                seen.add(h.url);
                local.push({ kind: 'history', label: h.title || displayUrl(h.url), detail: displayUrl(h.url), url: h.url });
            }
        }

        for (const s of remote) {
            if (s.toLowerCase() !== q.toLowerCase()) list.push({ kind: 'search', label: s, url: searchUrl(s, searchEngine) });
            if (list.length >= 6) break;
        }
        return [...list.slice(0, 2), ...local, ...list.slice(2)].slice(0, 9);
    }, [query, remote, searchEngine]);

    useEffect(() => setSelected(0), [query]);

    const navigate = (target: string | null) => {
        if (!tab || !target) return;
        dispatch({ type: 'LOAD_URL', payload: { id: tab.id, url: target } });
        setEdited(false);
        inputRef.current?.blur();
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown' && suggestions.length) {
            e.preventDefault();
            setSelected(i => (i + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp' && suggestions.length) {
            e.preventDefault();
            setSelected(i => (i - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            navigate(suggestions[selected]?.url ?? resolveInput(text, searchEngine));
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (edited) {
                setEdited(false);
                setText(isNewTab ? '' : url);
                requestAnimationFrame(() => inputRef.current?.select());
            } else {
                inputRef.current?.blur();
            }
        }
    };

    const showDropdown = focused && edited && suggestions.length > 0;
    const value = focused || edited ? text : displayUrl(url);

    const siteIcon = tab?.incognito
        ? <VenetianMask size={14} />
        : !isWeb
            ? <Search size={14} />
            : url.startsWith('https:')
                ? <Lock size={12} strokeWidth={2.25} />
                : <TriangleAlert size={13} className="text-[#ff9f0a]" />;

    return (
        <div className="relative flex-1 min-w-0 mx-1.5 app-region-no-drag">
            <div
                className={`group relative h-[30px] flex items-center gap-1 rounded-[9px] pl-1 pr-1 transition-[background-color,box-shadow] duration-150 ${focused
                    ? 'bg-underlay-bg shadow-[0_0_0_1px_rgb(var(--underlay-accent)/0.8),0_0_0_4px_var(--underlay-focus)]'
                    : 'bg-underlay-text/[0.07] hover:bg-underlay-text/[0.1]'
                    }`}
            >
                <button
                    onClick={() => isWeb && setShowSiteInfo(v => !v)}
                    className={`h-6 min-w-6 px-1 flex items-center justify-center gap-1 rounded-md text-underlay-text/55 ${isWeb ? 'hover:bg-underlay-text/10 hover:text-underlay-text' : ''}`}
                    aria-label="Site information"
                    title={isWeb ? 'Site information' : undefined}
                    tabIndex={isWeb ? 0 : -1}
                >
                    {siteIcon}
                    {isWeb && !tab?.incognito && prefs.shields && blocked > 0 && (
                        <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#30d158] tabular-nums">
                            <ShieldCheck size={12} strokeWidth={2.25} />
                            {blocked}
                        </span>
                    )}
                </button>

                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => {
                        setText(e.target.value);
                        setEdited(true);
                    }}
                    onFocus={() => {
                        setFocused(true);
                        setShowSiteInfo(false);
                        requestAnimationFrame(() => inputRef.current?.select());
                    }}
                    onBlur={() => {
                        setFocused(false);
                        setEdited(false);
                    }}
                    onKeyDown={onKeyDown}
                    placeholder={tab?.incognito ? 'Search privately or enter address' : `Search ${SEARCH_ENGINES[searchEngine]?.name ?? 'Google'} or enter address`}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    aria-label="Address and search bar"
                    aria-expanded={showDropdown}
                    aria-autocomplete="list"
                    className={`flex-1 min-w-0 h-full bg-transparent outline-none text-[13px] placeholder:text-underlay-text/40 ${focused ? 'text-left' : 'text-center'} text-underlay-text`}
                />

                {isWeb && !focused && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 data-[on=true]:opacity-100" data-on={isBookmarked || tab?.readerActive ? 'true' : undefined}>
                        <button
                            onClick={() => tab && dispatch({ type: 'UPDATE_TAB', payload: { id: tab.id, data: { readerActive: !tab.readerActive } } })}
                            className={`h-6 w-6 flex items-center justify-center rounded-md hover:bg-underlay-text/10 ${tab?.readerActive ? 'text-underlay-accent' : 'text-underlay-text/50 hover:text-underlay-text'}`}
                            title="Reader"
                            aria-pressed={!!tab?.readerActive}
                        >
                            <BookOpen size={14} />
                        </button>
                        <button
                            onClick={() => tab && dispatch({ type: 'TOGGLE_BOOKMARK', payload: { url: tab.url, title: tab.title } })}
                            className={`h-6 w-6 flex items-center justify-center rounded-md hover:bg-underlay-text/10 ${isBookmarked ? 'text-[#ffd60a]' : 'text-underlay-text/50 hover:text-underlay-text'}`}
                            title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
                            aria-pressed={isBookmarked}
                        >
                            <Star size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                    </div>
                )}

                {/* Page load progress, hugging the bottom edge */}
                {isLoading && !focused && (
                    <div className="absolute left-2 right-2 bottom-0 h-[2px] overflow-hidden rounded-full">
                        <div className="h-full w-2/5 rounded-full bg-underlay-accent animate-progress" />
                    </div>
                )}
            </div>

            {showDropdown && (
                <div className="popover absolute top-full left-0 right-0 mt-1.5 py-1.5 z-50 overflow-hidden" role="listbox">
                    {suggestions.map((s, i) => (
                        <div
                            key={`${s.kind}:${s.url}`}
                            role="option"
                            aria-selected={i === selected}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                navigate(s.url);
                            }}
                            onMouseMove={() => setSelected(i)}
                            className={`mx-1.5 px-2.5 h-8 flex items-center gap-2.5 rounded-md text-[13px] ${i === selected ? 'bg-underlay-accent text-white' : 'text-underlay-text'}`}
                        >
                            <span className={i === selected ? 'text-white/90' : 'text-underlay-text/45'}>
                                {s.kind === 'search' ? <Search size={14} /> : s.kind === 'history' ? <Clock size={14} /> : s.kind === 'bookmark' ? <Star size={14} /> : <Globe size={14} />}
                            </span>
                            <span className="truncate">{s.label}</span>
                            {s.detail && (
                                <span className={`truncate text-[12px] ${i === selected ? 'text-white/70' : 'text-underlay-text/40'}`}>— {s.detail}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showSiteInfo && tab && (
                    <PrivacyShield
                        url={tab.url}
                        incognito={!!tab.incognito}
                        stats={tab.blockedStats}
                        shieldsEnabled={prefs.shields}
                        onToggleShields={(shields) => setPrefs({ shields })}
                        onClose={() => setShowSiteInfo(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}


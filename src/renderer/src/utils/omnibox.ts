import { useEffect, useState } from 'react';

export type SearchEngineId = 'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia';

export const SEARCH_ENGINES: Record<SearchEngineId, { name: string; url: (q: string) => string }> = {
    google: { name: 'Google', url: q => `https://www.google.com/search?q=${q}` },
    duckduckgo: { name: 'DuckDuckGo', url: q => `https://duckduckgo.com/?q=${q}` },
    bing: { name: 'Bing', url: q => `https://www.bing.com/search?q=${q}` },
    brave: { name: 'Brave Search', url: q => `https://search.brave.com/search?q=${q}` },
    ecosia: { name: 'Ecosia', url: q => `https://www.ecosia.org/search?q=${q}` }
};

export function searchUrl(query: string, engine: SearchEngineId = 'google') {
    return (SEARCH_ENGINES[engine] ?? SEARCH_ENGINES.google).url(encodeURIComponent(query.trim()));
}

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/|$)/i;
const DOMAIN_LIKE = /^[^\s/?#]+\.[a-z]{2,}(:\d+)?([/?#]\S*)?$/i;

/** Turns whatever was typed into the address bar into a URL to load. */
export function resolveInput(raw: string, engine: SearchEngineId = 'google'): string | null {
    const input = raw.trim();
    if (!input) return null;
    if (/^(https?|about|underlay):/i.test(input)) return input;
    if (LOCAL_HOST.test(input)) return `http://${input}`;
    if (DOMAIN_LIKE.test(input)) return `https://${input}`;
    return searchUrl(input, engine);
}

export function looksLikeUrl(raw: string) {
    const input = raw.trim();
    return /^(https?|about|underlay):/i.test(input) || LOCAL_HOST.test(input) || DOMAIN_LIKE.test(input);
}

/** Shows a URL the way Safari does: no scheme, no "www.", no trailing slash. */
export function displayUrl(url: string) {
    if (!url || url === 'underlay://newtab') return '';
    try {
        const u = new URL(url);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return url;
        const path = u.pathname === '/' ? '' : u.pathname;
        return `${u.hostname.replace(/^www\./, '')}${path}${u.search}${u.hash}`;
    } catch {
        return url;
    }
}

export function hostnameOf(url: string) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

/** Debounced search suggestions. Disabled in private tabs and for URLs. */
export function useSuggestions(query: string, engine: SearchEngineId, enabled: boolean) {
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        const q = query.trim();
        if (!enabled || q.length < 2 || looksLikeUrl(q) || !window.electron?.search) {
            setSuggestions([]);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(() => {
            window.electron.search.suggest(q, engine)
                .then(result => { if (!cancelled) setSuggestions(Array.isArray(result) ? result.slice(0, 6) : []); })
                .catch(() => { if (!cancelled) setSuggestions([]); });
        }, 150);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, engine, enabled]);

    return suggestions;
}

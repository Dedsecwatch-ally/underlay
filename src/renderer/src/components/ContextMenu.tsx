import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { dispatch, getBrowserState } from '../context/BrowserContext';
import { webviews } from '../utils/webviews';
import { searchUrl, SEARCH_ENGINES } from '../utils/omnibox';
import { shortcut } from '../utils/PlatformUtils';

interface ContextMenuData {
    x: number;
    y: number;
    selectionText?: string;
    mediaType?: string;
    srcUrl?: string;
    linkUrl?: string;
    isEditable?: boolean;
}

type Entry = { label: string; hint?: string; disabled?: boolean; run: () => void } | 'separator';

/** Page context menu, styled like a native macOS menu. */
export const ContextMenu: React.FC = () => {
    const [menu, setMenu] = useState<(ContextMenuData & { left: number; top: number }) | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ left: 0, top: 0 });

    useEffect(() => {
        const cleanup = window.electron?.ui?.onContextMenu((data: ContextMenuData) => {
            // Coordinates arrive relative to the page; translate to the window.
            const rect = webviews.get(getBrowserState().activeTabId)?.getBoundingClientRect();
            setMenu({ ...data, left: data.x + (rect?.left ?? 0), top: data.y + (rect?.top ?? 0) });
        });
        const close = () => setMenu(null);
        const onPointerDown = (e: PointerEvent) => {
            if (!ref.current?.contains(e.target as Node)) close();
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('blur', close); // focus moved into the page
        window.addEventListener('resize', close);
        window.addEventListener('keydown', onKey);
        return () => {
            cleanup?.();
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('blur', close);
            window.removeEventListener('resize', close);
            window.removeEventListener('keydown', onKey);
        };
    }, []);

    // Keep the menu on screen, flipping like a native menu would.
    useLayoutEffect(() => {
        if (!menu || !ref.current) return;
        const { width, height } = ref.current.getBoundingClientRect();
        setPosition({
            left: menu.left + width > window.innerWidth - 8 ? Math.max(8, menu.left - width) : menu.left,
            top: menu.top + height > window.innerHeight - 8 ? Math.max(8, menu.top - height) : menu.top
        });
    }, [menu]);

    if (!menu) return null;

    const webview = webviews.get(getBrowserState().activeTabId);
    const tab = getBrowserState().tabs.find(t => t.id === getBrowserState().activeTabId);
    const engine = getBrowserState().settings.searchEngine;
    const close = () => setMenu(null);
    const act = (fn: () => void) => () => {
        close();
        try { fn(); } catch (e) { console.warn('[ContextMenu]', e); }
    };
    const copyText = (text: string) => navigator.clipboard.writeText(text).catch(() => { });
    const openTab = (url: string, incognito = !!tab?.incognito) => dispatch({ type: 'NEW_TAB', payload: { url, incognito, background: true } });

    const entries: Entry[] = [];
    const selection = menu.selectionText?.trim();

    if (menu.linkUrl) {
        entries.push(
            { label: 'Open Link in New Tab', run: act(() => openTab(menu.linkUrl!)) },
            { label: 'Open Link in Private Tab', run: act(() => openTab(menu.linkUrl!, true)) },
            { label: 'Copy Link', run: act(() => copyText(menu.linkUrl!)) },
            'separator'
        );
    }
    if (menu.mediaType === 'image' && menu.srcUrl) {
        entries.push(
            { label: 'Open Image in New Tab', run: act(() => openTab(menu.srcUrl!)) },
            { label: 'Save Image…', run: act(() => webview?.downloadURL(menu.srcUrl!)) },
            { label: 'Copy Image Address', run: act(() => copyText(menu.srcUrl!)) },
            'separator'
        );
    }
    if (menu.isEditable) {
        entries.push(
            { label: 'Cut', hint: shortcut('X'), run: act(() => webview?.cut()) },
            { label: 'Copy', hint: shortcut('C'), run: act(() => webview?.copy()) },
            { label: 'Paste', hint: shortcut('V'), run: act(() => webview?.paste()) },
            'separator'
        );
    } else if (selection) {
        const preview = selection.length > 24 ? `${selection.slice(0, 24)}…` : selection;
        entries.push(
            { label: 'Copy', hint: shortcut('C'), run: act(() => webview?.copy()) },
            { label: `Search ${SEARCH_ENGINES[engine]?.name ?? 'Google'} for “${preview}”`, run: act(() => openTab(searchUrl(selection, engine))) },
            'separator'
        );
    }
    if (!menu.linkUrl && !selection && !menu.isEditable && menu.mediaType !== 'image') {
        entries.push(
            { label: 'Back', hint: shortcut('['), disabled: !webview?.canGoBack(), run: act(() => webview?.goBack()) },
            { label: 'Forward', hint: shortcut(']'), disabled: !webview?.canGoForward(), run: act(() => webview?.goForward()) },
            { label: 'Reload', hint: shortcut('R'), run: act(() => webview?.reload()) },
            'separator',
            {
                label: 'Take Screenshot', run: act(async () => {
                    const dataUrl = await window.underlay.screenshot.captureVisible();
                    if (!dataUrl) return;
                    const link = document.createElement('a');
                    link.href = dataUrl;
                    link.download = `Underlay Screenshot ${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '.')}.png`;
                    link.click();
                })
            },
            'separator'
        );
    }
    entries.push({ label: 'Inspect Element', run: act(() => webview?.inspectElement(menu.x, menu.y)) });

    // Drop leading/trailing/duplicate separators.
    const cleaned = entries.filter((e, i, all) => e !== 'separator' || (i > 0 && i < all.length - 1 && all[i - 1] !== 'separator'));

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.08 }}
            className="popover fixed z-[9999] min-w-[220px] max-w-[320px] p-[5px] text-[13px] text-underlay-text !rounded-[10px]"
            style={position}
            role="menu"
            onContextMenu={(e) => e.preventDefault()}
        >
            {cleaned.map((entry, i) => entry === 'separator' ? (
                <div key={`sep-${i}`} className="h-px my-[5px] mx-2.5 bg-underlay-text/10" role="separator" />
            ) : (
                <button
                    key={entry.label}
                    role="menuitem"
                    disabled={entry.disabled}
                    onClick={entry.run}
                    className="w-full h-[24px] px-2.5 flex items-center justify-between gap-6 rounded-[5px] text-left hover:bg-underlay-accent hover:text-white disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-underlay-text"
                >
                    <span className="truncate">{entry.label}</span>
                    {entry.hint && <span className="text-[12px] opacity-50">{entry.hint}</span>}
                </button>
            ))}
        </motion.div>
    );
};

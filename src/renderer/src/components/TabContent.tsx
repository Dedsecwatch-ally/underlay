import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Readability } from '@mozilla/readability';
import { isElectron } from '../utils/PlatformUtils';
import { dispatch, getBrowserState, Tab } from '../context/BrowserContext';
import { webviews } from '../utils/webviews';
import { ReaderView } from './ReaderView';
import { CrashedTab } from './CrashedTab';

interface TabContentProps {
    id: string;
    url: string;
    isActive: boolean;
    isSuspended: boolean;
    isIncognito: boolean;
    isCrashed: boolean;
    readerActive?: boolean;
    readerContent?: any;
}

const BROWSING_PARTITION = 'persist:underlay';
const INCOGNITO_PARTITION = 'underlay-incognito';
// Locked down again in the main process (will-attach-webview); this is only
// the request.
const WEB_PREFERENCES = 'contextIsolation=yes, sandbox=yes, nodeIntegration=no, plugins=yes, safeDialogs=yes, scrollBounce=yes';

const update = (id: string, data: Partial<Tab>) => dispatch({ type: 'UPDATE_TAB', payload: { id, data } });

/**
 * One tab's web content. All webview events are wired up once per webview
 * element and dispatch straight to the store, so this component never needs
 * callback props and only re-renders when its own tab changes.
 */
export const TabContent = React.memo(function TabContent({
    id, url, isActive, isSuspended, isIncognito, isCrashed, readerActive, readerContent
}: TabContentProps) {
    // The URL the <webview> is created with. While a tab sleeps we keep it in
    // sync, so waking up restores the page the user was actually on.
    const [src, setSrc] = useState(url);
    const [instance, setInstance] = useState(0);
    const webviewRef = useRef<Electron.WebviewTag | null>(null);

    useEffect(() => {
        if (isSuspended || isCrashed) setSrc(url);
    }, [isSuspended, isCrashed, url]);

    // Imperative navigation from the address bar / bookmarks.
    useEffect(() => {
        const onLoadUrl = (e: Event) => {
            const detail = (e as CustomEvent<{ id: string; url: string }>).detail;
            if (detail.id !== id) return;
            const webview = webviewRef.current;
            if (!webview) {
                setSrc(detail.url);
                return;
            }
            try {
                webview.loadURL(detail.url).catch(() => { });
            } catch {
                setSrc(detail.url);
            }
        };
        window.addEventListener('browser-load-url', onLoadUrl);
        return () => window.removeEventListener('browser-load-url', onLoadUrl);
    }, [id]);

    // Give keyboard focus to the page when its tab is selected.
    useEffect(() => {
        if (isActive && !isSuspended) {
            try { webviewRef.current?.focus(); } catch { }
        }
    }, [isActive, isSuspended]);

    // Reader mode: grab the page HTML and parse it here, in the UI.
    useEffect(() => {
        const webview = webviewRef.current;
        if (!readerActive || readerContent || !webview) return;
        webview.executeJavaScript('document.documentElement.outerHTML')
            .then((html: string) => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const base = doc.createElement('base');
                base.href = webview.getURL();
                doc.head.prepend(base);
                const article = new Readability(doc).parse();
                update(id, article ? { readerContent: article } : { readerActive: false });
            })
            .catch(() => update(id, { readerActive: false }));
    }, [id, readerActive, readerContent]);

    const attach = useCallback((element: Electron.WebviewTag | null) => {
        const previous = webviewRef.current;
        if (previous === element) return;
        webviewRef.current = element;
        if (!element) {
            if (previous) webviews.unregister(id);
            return;
        }
        webviews.register(id, element);

        const isMain = (e: any) => e.isMainFrame !== false;
        let committedUrl = '';

        element.addEventListener('dom-ready', () => {
            try { webviews.setContentsId(id, element.getWebContentsId()); } catch { }
        });
        element.addEventListener('did-start-loading', () => update(id, { status: 'loading' }));
        element.addEventListener('did-stop-loading', () => {
            const currentUrl = element.getURL();
            const title = element.getTitle() || currentUrl;
            update(id, { status: 'ready', title });
            const tab = getBrowserState().tabs.find(t => t.id === id);
            if (!isIncognito && currentUrl.startsWith('http') && tab) {
                dispatch({ type: 'ADD_HISTORY', payload: { url: currentUrl, title } });
            }
        });
        const navState = () => ({ canGoBack: element.canGoBack(), canGoForward: element.canGoForward() });
        element.addEventListener('did-navigate', (e: any) => {
            if (e.url === 'about:blank') return;
            update(id, navState());
            if (e.url !== committedUrl) {
                committedUrl = e.url;
                // A new page: reset per-page state.
                update(id, { url: e.url, favicon: undefined, blockedStats: undefined, readerActive: false, readerContent: undefined });
            }
        });
        element.addEventListener('did-navigate-in-page', (e: any) => {
            if (isMain(e) && e.url !== 'about:blank') update(id, { url: e.url, ...navState() });
        });
        element.addEventListener('page-title-updated', (e: any) => update(id, { title: e.title }));
        element.addEventListener('page-favicon-updated', (e: any) => {
            const favicon = e.favicons?.find((f: string) => /^(https?|data):/.test(f));
            if (favicon) update(id, { favicon });
        });
        element.addEventListener('did-fail-load', (e: any) => {
            // -3 is "aborted" (e.g. a new navigation replaced this one).
            if (isMain(e) && e.errorCode !== -3) update(id, { status: 'ready' });
        });
        element.addEventListener('render-process-gone', (e: any) => {
            if (e.details?.reason !== 'clean-exit') update(id, { status: 'crashed' });
        });
        element.addEventListener('media-started-playing', () => update(id, { audible: true }));
        element.addEventListener('media-paused', () => update(id, { audible: false }));
    }, [id, isIncognito]);

    useEffect(() => () => webviews.unregister(id), [id]);

    if (!isElectron) {
        if (isSuspended) return null;
        return (
            <iframe
                src={src}
                className="w-full h-full border-none bg-white"
                style={{ visibility: isActive ? 'visible' : 'hidden' }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                onLoad={() => update(id, { status: 'ready' })}
            />
        );
    }

    if (isCrashed) {
        return (
            <CrashedTab
                onClose={() => dispatch({ type: 'CLOSE_TAB', payload: { id } })}
                onReload={() => {
                    update(id, { status: 'ready' });
                    setInstance(n => n + 1);
                }}
            />
        );
    }

    if (isSuspended) return null;

    return (
        <>
            <webview
                key={instance}
                // @ts-ignore - React's ref typing doesn't know about WebviewTag
                ref={attach}
                src={src}
                className="w-full h-full"
                style={{ backgroundColor: '#ffffff', border: 'none' }}
                // @ts-ignore - boolean attribute must be passed as a string
                allowpopups="true"
                partition={isIncognito ? INCOGNITO_PARTITION : BROWSING_PARTITION}
                webpreferences={WEB_PREFERENCES}
            />
            <ReaderView
                data={readerContent}
                isVisible={!!readerActive}
                onClose={() => update(id, { readerActive: false })}
            />
        </>
    );
});

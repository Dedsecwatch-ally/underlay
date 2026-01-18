import React, { useEffect, useRef } from 'react';
import { isElectron, isMobile } from '../utils/PlatformUtils';

import { Readability } from '@mozilla/readability';
import { ReaderView } from './ReaderView';

interface TabContentProps {
    id: string;
    url: string;
    isActive: boolean;
    isSuspended: boolean;
    isIncognito: boolean;
    onCrashed?: () => void;
    onUnresponsive?: () => void;
    onDidStartLoading?: () => void;
    onDidStopLoading?: (data: { url: string; title: string }) => void;
    onDidNavigate?: (url: string) => void;
    onDidFailLoad?: () => void;
    onDomReady?: () => void;
    onPageTitleUpdated?: (title: string) => void;
    onPageFaviconUpdated?: (favicon: string) => void;
    onNewWindow?: (url: string) => void;
    onProfileDetected?: (profile: { name: string; email: string; avatar: string }) => void;
    onMediaStartedPlaying?: () => void;
    onMediaPaused?: () => void;

    onWebviewReady?: (webview: any) => void;
    // Reader Mode
    readerActive?: boolean;
    readerContent?: any;
    onReaderParsed?: (data: any) => void;
}

export const TabContent: React.FC<TabContentProps> = ({
    id,
    url,
    isActive,
    isSuspended,
    isIncognito,
    onCrashed,
    onUnresponsive,
    onDidStartLoading,
    onDidStopLoading,
    onDidNavigate,
    onDidFailLoad,
    onDomReady,
    onPageTitleUpdated,
    onPageFaviconUpdated,
    onNewWindow,
    onProfileDetected,
    onMediaStartedPlaying,
    onMediaPaused,

    onWebviewReady,
    readerActive,
    readerContent,
    onReaderParsed
}) => {
    const [initialUrl] = React.useState(url);
    const webviewRef = useRef<any>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Focus management
    useEffect(() => {
        if (isActive && !isSuspended) {
            if (isElectron && webviewRef.current) {
                // webview focus
                try { webviewRef.current.focus(); } catch (e) { }
            } else if (!isElectron && iframeRef.current) {
                // iframe focus
                try { iframeRef.current.focus(); } catch (e) { }
            }
        }
    }, [isActive, isSuspended]);

    // Reader Mode Logic
    useEffect(() => {
        if (readerActive && !readerContent && webviewRef.current) {
            try {
                // 1. Get HTML from Webview
                webviewRef.current.executeJavaScript('document.documentElement.outerHTML')
                    .then((html: string) => {
                        // 2. Parse in Renderer
                        const doc = new DOMParser().parseFromString(html, 'text/html');
                        const reader = new Readability(doc);
                        const article = reader.parse();

                        if (article && onReaderParsed) {
                            onReaderParsed(article);
                        }
                    })
                    .catch((err: any) => console.error("Reader Mode Parse Error:", err));
            } catch (e) { }
        }
    }, [readerActive, readerContent]);

    // Reader Mode Logic
    useEffect(() => {
        if (readerActive && !readerContent && webviewRef.current) {
            try {
                // 1. Get HTML from Webview
                webviewRef.current.executeJavaScript('document.documentElement.outerHTML')
                    .then((html: string) => {
                        // 2. Parse in Renderer
                        const doc = new DOMParser().parseFromString(html, 'text/html');
                        const reader = new Readability(doc);
                        const article = reader.parse();

                        if (article && onReaderParsed) {
                            onReaderParsed(article);
                        }
                    })
                    .catch((err: any) => console.error("Reader Mode Parse Error:", err));
            } catch (e) { }
        }
    }, [readerActive, readerContent]);


    // Event Driven Navigation (Robustness) - Handles User Input (Enter, Bookmarks)
    useEffect(() => {
        const handleLoadUrl = (e: CustomEvent) => {
            if (e.detail.id === id && webviewRef.current) {
                try {
                    const target = e.detail.url;
                    // Only load if it's actually different to prevent reload loops
                    if (webviewRef.current.getURL() !== target) {
                        webviewRef.current.loadURL(target);
                    }
                } catch (err) { }
            }
        };
        window.addEventListener('browser-load-url', handleLoadUrl as any);
        return () => window.removeEventListener('browser-load-url', handleLoadUrl as any);
    }, [id]);

    // Force Initial Load if SRC fails, but DO NOT SYNC continuously (prevents race conditions with internal navs)
    useEffect(() => {
        if (webviewRef.current && url && url !== 'underlay://newtab') {
            try {
                const current = webviewRef.current.getURL();
                // Only load if we are on blank (fresh tab), otherwise trust the webview's internal state
                if (current === 'about:blank') {
                    webviewRef.current.loadURL(url);
                }
            } catch (e) { }
        }
    }, [id]); // Check on mount/id change, not on every URL change


    // ELECTRON IMPLEMENTATION (<webview>)
    if (isElectron) {
        if (isSuspended) return null;

        return (
            <>
                <webview
                    // @ts-ignore
                    ref={(ref: any) => {
                        if (ref) {
                            webviewRef.current = ref;
                            if (onWebviewReady) onWebviewReady(ref);

                            // Attach listeners once
                            if (!ref.dataset.attached) {
                                ref.dataset.attached = "true";

                                ref.addEventListener('crashed', onCrashed);
                                ref.addEventListener('unresponsive', onUnresponsive);
                                ref.addEventListener('did-fail-load', (e: any) => {
                                    if (onDidFailLoad) onDidFailLoad();
                                });

                                ref.addEventListener('did-start-loading', () => {
                                    if (onDidStartLoading) onDidStartLoading();
                                    // Inject base CSS for dark mode
                                    ref.insertCSS('html, body { background-color: #0f0f11; }');
                                });

                                // CRITICAL: Ensure initial URL loads (sometimes src attribute is ignored in complex layouts)
                                if (initialUrl && initialUrl !== 'about:blank' && initialUrl !== 'underlay://newtab') {
                                    setTimeout(() => {
                                        if (ref.getURL() === 'about:blank') {
                                            ref.loadURL(initialUrl);
                                        }
                                    }, 100);
                                }

                                ref.addEventListener('did-stop-loading', () => {
                                    const currentUrl = ref.getURL();
                                    const currentTitle = ref.getTitle();
                                    if (currentUrl !== 'about:blank' && onDidStopLoading) {
                                        onDidStopLoading({ url: currentUrl, title: currentTitle });
                                    }
                                });

                                ref.addEventListener('did-navigate', (e: any) => {
                                    if (e.url !== 'about:blank' && onDidNavigate) onDidNavigate(e.url);
                                });

                                ref.addEventListener('did-navigate-in-page', (e: any) => {
                                    if (e.url !== 'about:blank' && onDidNavigate) onDidNavigate(e.url);
                                });



                                ref.addEventListener('dom-ready', () => {
                                    if (onDomReady) onDomReady();

                                    // Google Profile Scraping
                                    const u = ref.getURL();
                                    if ((u.includes('google.com') || u.includes('youtube.com')) && !isIncognito && onProfileDetected) {
                                        ref.executeJavaScript(`
                                        (function() {
                                            return new Promise((resolve) => {
                                                const findProfile = () => {
                                                    try {
                                                        // Strategy 1: The standard Google Account button in the top right
                                                        const btn = document.querySelector('a[aria-label^="Google Account:"]');
                                                        if (btn) {
                                                            const label = btn.getAttribute('aria-label');
                                                            const img = btn.querySelector('img')?.src;
                                                            // Format: "Google Account: Name  (email)"
                                                            const match = label ? label.match(/Google Account:\\s+(.+)\\s+\\((.+)\\)/) : null;
                                                            if (match) {
                                                                return { name: match[1], email: match[2], avatar: img };
                                                            }
                                                        }
                                                        
                                                        // Strategy 2: YouTube specific (sometimes different)
                                                        const ytBtn = document.querySelector('button#avatar-btn');
                                                        if (ytBtn) {
                                                            const img = ytBtn.querySelector('img')?.src;
                                                            // YouTube often hides email in aria-label differently, but let's try
                                                            // If we can't get email, we might just get avatar
                                                            if (img) return { name: 'YouTube User', email: '', avatar: img }; 
                                                        }
                                                        
                                                        return null;
                                                    } catch(e) { return null; }
                                                };

                                                const existing = findProfile();
                                                if (existing) {
                                                    resolve(existing);
                                                    return;
                                                }

                                                // Async observer
                                                const observer = new MutationObserver(() => {
                                                    const profile = findProfile();
                                                    if (profile) {
                                                        observer.disconnect();
                                                        resolve(profile);
                                                    }
                                                });

                                                observer.observe(document.body, { childList: true, subtree: true });

                                                // Timeout after 15 seconds to stop wasting resources
                                                setTimeout(() => {
                                                    observer.disconnect();
                                                    resolve(null);
                                                }, 15000);
                                            });
                                        })()
                                    `)
                                            .then((result: any) => {
                                                if (result && result.name) {
                                                    console.log("Profile Detected:", result);
                                                    onProfileDetected(result);
                                                }
                                            })
                                            .catch((err: any) => { console.error("Profile scrape error:", err); });
                                    }
                                });

                                ref.addEventListener('page-title-updated', (e: any) => {
                                    if (onPageTitleUpdated) onPageTitleUpdated(e.title);
                                });

                                ref.addEventListener('page-favicon-updated', (e: any) => {
                                    if (e.favicons && e.favicons.length > 0 && onPageFaviconUpdated) {
                                        onPageFaviconUpdated(e.favicons[0]);
                                    }
                                });

                                ref.addEventListener('new-window', (e: any) => {
                                    const { url, disposition, options } = e;



                                    // POPUP DETECTION
                                    // 1. Check explicit URL whitelist (Auth providers)
                                    const isKnownAuth =
                                        url.includes('accounts.google.com') ||
                                        url.includes('google.com/o/oauth2') ||
                                        url.includes('facebook.com/v') ||
                                        url.includes('appleid.apple.com') ||
                                        url.includes('auth') ||
                                        url.includes('oauth') ||
                                        url.includes('login') ||
                                        url.includes('openid');

                                    // 2. Check Disposition implies Popup
                                    // 'new-window' usually means window.open with features (width/height) or just a generic open
                                    // We STRICTLY only allow native popups if they are Auth or have explicit dimensions (login prompts)
                                    const hasDimensions = options && (options.width || options.height);

                                    if (isKnownAuth || (disposition === 'new-window' && hasDimensions)) {
                                        console.log("-> Allowing as Native Popup (Auth or Dimensions)");
                                        return; // Allow native window
                                    }

                                    // Otherwise, force into our Tab System (e.g. "Visit Site" buttons)
                                    e.preventDefault();
                                    if (onNewWindow) onNewWindow(e.url);
                                });

                                // Forward keyboard shortcuts
                                ref.addEventListener('before-input-event', (e: any) => {
                                    const { type, key, meta, control, shift } = e;
                                    if (type !== 'keyDown') return;

                                    const isCmd = meta || control;
                                    const shortcuts = ['k', 't', 'w', 'l', 'r', '[', ']', 'ArrowLeft', 'ArrowRight'];
                                    if (isCmd && (shortcuts.includes(key) || (key === 'n' && shift))) {
                                        const event = new KeyboardEvent('keydown', {
                                            key: key,
                                            metaKey: meta,
                                            ctrlKey: control,
                                            shiftKey: shift,
                                            bubbles: true
                                        });
                                        window.dispatchEvent(event);
                                    }
                                });
                                // Media Events for Background Playback Optimization
                                ref.addEventListener('media-started-playing', () => {
                                    if (onMediaStartedPlaying) onMediaStartedPlaying();
                                });
                                ref.addEventListener('media-paused', () => {
                                    if (onMediaPaused) onMediaPaused();
                                });
                            }
                        }
                    }}
                    src={initialUrl}
                    className="w-full h-full non-draggable"
                    style={{
                        backgroundColor: '#0f0f11',
                        border: 'none',
                        visibility: isActive ? 'visible' : 'hidden'
                    }}
                    allowpopups
                    partition={isIncognito ? 'underlay-incognito' : 'persist:underlay'}
                    useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.86 Safari/537.36"
                    webpreferences="contextIsolation=yes, sandbox=no, nodeIntegration=no, enableRemoteModule=no, backgroundThrottling=no, plugins=yes, nativeWindowOpen=yes, webgl=yes, experimentalFeatures=yes, safeDialogs=yes, autoplayPolicy=no-user-gesture-required, scrollBounce=yes"
                />
                {/* Reader Mode Overlay */}
                <ReaderView
                    data={readerContent}
                    isVisible={!!readerActive}
                    onClose={() => {
                        window.dispatchEvent(new CustomEvent('close-reader-mode', { detail: { id } }));
                    }}
                />
            </>
        );
    }


    // MOBILE / WEB IMPLEMENTATION (<iframe>)
    if (isSuspended) return null;

    return (
        <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full border-none bg-white"
            style={{
                visibility: isActive ? 'visible' : 'hidden',
                backgroundColor: '#ffffff'
            }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
            onLoad={() => {
                // Limited capability in iframe for cross-origin
                if (onDidStopLoading) onDidStopLoading({ url, title: '' });
            }}
        />
    );
};

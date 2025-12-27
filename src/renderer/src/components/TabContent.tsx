import React, { useEffect, useRef } from 'react';
import { isElectron, isMobile } from '../utils/PlatformUtils';

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
    onWebviewReady
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

    // ELECTRON IMPLEMENTATION (<webview>)
    if (isElectron) {
        if (isSuspended) return null;

        return (
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
                            ref.addEventListener('did-fail-load', onDidFailLoad);

                            ref.addEventListener('did-start-loading', () => {
                                if (onDidStartLoading) onDidStartLoading();
                                // Inject base CSS for dark mode
                                ref.insertCSS('html, body { background-color: #0f0f11; }');
                            });

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
                                console.log(`[NewWindow] URL: ${url}, Disposition: ${disposition}`);

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
                                // 'new-window' usually means window.open with features (width/height)
                                // 'foreground-tab' means window.open with just _blank
                                // We want to allow specific popups to stay as native windows for Opener access
                                if (disposition === 'new-window' || isKnownAuth) {
                                    console.log("-> Allowing as Native Popup (Opener Preserved)");
                                    return; // Allow native window
                                }

                                // Otherwise, force into our Tab System
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
                webpreferences="contextIsolation=yes, sandbox=yes, nodeIntegration=no, enableRemoteModule=no, backgroundThrottling=yes, plugins=yes, nativeWindowOpen=yes"
            />
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

import React, { useState, useEffect, KeyboardEvent } from 'react';
import { useBrowser } from '../context/BrowserContext';
import { ArrowLeft, ArrowRight, RotateCcw, ShieldCheck, X, Star, VenetianMask } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { CertViewer } from './CertViewer';

export function AddressBar() {
    const { state, dispatch } = useBrowser();
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    const [inputUrl, setInputUrl] = useState('');
    const [securityState, setSecurityState] = useState<any>(null);
    const [showCertViewer, setShowCertViewer] = useState(false);
    const isLoading = activeTab?.status === 'loading';

    const isBookmarked = state.bookmarks.some(b => b.url === activeTab?.url);

    const toggleBookmark = () => {
        if (activeTab) {
            dispatch({ type: 'TOGGLE_BOOKMARK', payload: { url: activeTab.url, title: activeTab.title } });
        }
    };

    // Sync input with active tab URL
    useEffect(() => {
        if (activeTab) {
            // Hide internal newtab url for cleaner aesthetics
            setInputUrl(activeTab.url === 'underlay://newtab' ? '' : activeTab.url);
        }
    }, [activeTab?.id, activeTab?.url]);

    // Listen for Security State
    useEffect(() => {
        if (!activeTab) return;
        setSecurityState(null); // Reset on tab switch/load potentially (simple check)

        // In a real app we'd map security state to tab ID. 
        // For now, assuming single tab dominance or simple event flow
        if (window.electron.security?.onSecurityStateChange) {
            const cleanup = window.electron.security.onSecurityStateChange((data) => {
                setSecurityState(data);
            });
            return cleanup;
        }
    }, [activeTab?.id]);

    // Handle Focus Command
    const inputRef = React.useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (state.activeCommand?.type === 'focusAddressBar') {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [state.activeCommand]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && activeTab) {
            let url = inputUrl.trim();
            if (!url) return;

            // Smart Parsing Logic
            const hasProtocol = /^https?:\/\//i.test(url);
            const hasDomainDot = url.includes('.') && !url.includes(' ');
            const isLocalhost = url.startsWith('localhost');

            if (isLocalhost) {
                if (!hasProtocol) url = 'http://' + url;
            } else if (hasProtocol) {
                // valid url as is
            } else if (hasDomainDot) {
                // assume https
                url = 'https://' + url;
            } else {
                // Search query
                url = 'https://google.com/search?q=' + encodeURIComponent(url);
            }

            dispatch({ type: 'UPDATE_TAB', payload: { id: activeTab.id, data: { url } } });
        }
    };

    // Derived Security UI State
    let LockIcon = ShieldCheck;
    let lockColor = 'text-white/30';
    let tlsVersion = '';

    if (securityState && securityState.visibleSecurityState) {
        const { securityState: secState, certificateSecurityState } = securityState.visibleSecurityState;
        if (secState === 'secure') {
            lockColor = 'text-green-500';
            const protocol = certificateSecurityState?.protocol;
            if (protocol) {
                if (protocol.includes('1.2')) tlsVersion = '1.2';
                else if (protocol.includes('1.3')) tlsVersion = '1.3';
                else tlsVersion = 'TLS';
            }
        } else if (secState === 'insecure') {
            LockIcon = RotateCcw; // Using generic warning visual
            lockColor = 'text-red-500';
        }
    } else if (activeTab?.url.startsWith('https')) {
        // Fallback if no CDP data yet
        lockColor = 'text-green-500';
    } else if (activeTab?.url.startsWith('http')) {
        lockColor = 'text-red-400';
    }

    return (
        <div className="h-12 bg-underlay-surface border-b border-underlay-border flex items-center px-4 gap-3 z-10 relative overflow-hidden">
            <div className="flex gap-1 text-underlay-text/60">
                <NavButton icon={<ArrowLeft size={16} />} onClick={() => dispatch({ type: 'TRIGGER_COMMAND', payload: 'goBack' })} />
                <NavButton icon={<ArrowRight size={16} />} onClick={() => dispatch({ type: 'TRIGGER_COMMAND', payload: 'goForward' })} />
                {isLoading ? (
                    <NavButton icon={<X size={16} />} onClick={() => dispatch({ type: 'TRIGGER_COMMAND', payload: 'stop' })} />
                ) : (
                    <NavButton icon={<RotateCcw size={16} />} onClick={() => dispatch({ type: 'TRIGGER_COMMAND', payload: 'reload' })} />
                )}
            </div>

            <div className={`flex-1 bg-underlay-bg rounded-md h-8 flex items-center px-2 gap-2 border border-underlay-border focus-within:border-underlay-accent/50 transition-colors shadow-inner relative ${activeTab?.incognito ? 'bg-zinc-900 border-zinc-700 shadow-[0_0_15px_rgba(0,0,0,0.5)]' : ''}`}>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-underlay-text/5 p-1 rounded" onClick={() => setShowCertViewer(!showCertViewer)}>
                    {activeTab?.incognito ? (
                        <VenetianMask size={14} className="text-zinc-400" />
                    ) : (
                        <LockIcon size={14} className={lockColor} />
                    )}
                    {tlsVersion && !activeTab?.incognito && (
                        <span className="text-[9px] bg-green-500/20 text-green-400 px-1 rounded font-bold">{tlsVersion}</span>
                    )}
                    {activeTab?.url.startsWith('http:') && !activeTab?.incognito && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-red-400">Not Secure</span>
                    )}
                </div>

                {showCertViewer && (
                    <CertViewer securityState={securityState} onClose={() => setShowCertViewer(false)} />
                )}

                {activeTab?.pid && (
                    <span className="text-[9px] bg-underlay-text/10 px-1 rounded text-underlay-text/40 font-mono" title="Renderer Process ID">
                        PID:{activeTab.pid}
                    </span>
                )}

                <input
                    className="bg-transparent border-none outline-none flex-1 w-full text-xs text-underlay-text placeholder-underlay-text/20 font-mono"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                />

                <button
                    onClick={toggleBookmark}
                    className={`p-1 rounded-md transition-colors ${isBookmarked ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-underlay-text/20 hover:text-underlay-text/60 hover:bg-underlay-text/5'}`}
                >
                    <Star size={14} fill={isBookmarked ? "currentColor" : "none"} />
                </button>
            </div>

            {/* Loading Indicator */}
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-underlay-accent to-purple-500 w-full origin-left"
                    >
                        <motion.div
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            className="absolute inset-0 bg-white/50 blur-[2px]"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function NavButton({ icon, onClick }: { icon: React.ReactNode, onClick?: () => void }) {
    const handleClick = () => {
        window.dispatchEvent(new CustomEvent('underlay-trace', { detail: { layer: 'UI', message: 'Click Navigation' } }));
        onClick?.();
    };
    return (
        <button onClick={handleClick} className="p-1.5 hover:bg-underlay-text/10 rounded-md transition-colors text-inherit hover:text-underlay-text">
            {icon}
        </button>
    )
}

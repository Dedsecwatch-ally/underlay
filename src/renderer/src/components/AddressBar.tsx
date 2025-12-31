import React, { useState, useEffect, KeyboardEvent } from 'react';
import { useBrowser } from '../context/BrowserContext';
import { ArrowLeft, ArrowRight, RotateCcw, ShieldCheck, X, Star, VenetianMask, BookOpen } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { CertViewer } from './CertViewer';
import { PrivacyShield } from './PrivacyShield';

export function AddressBar() {
    const { state, dispatch } = useBrowser();
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    const [inputUrl, setInputUrl] = useState('');
    const [securityState, setSecurityState] = useState<any>(null);
    const [showCertViewer, setShowCertViewer] = useState(false);
    const [showShield, setShowShield] = useState(false);
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

    // Search Suggestions Logic
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    useEffect(() => {
        const fetchSuggestions = async () => {
            const query = inputUrl.trim();
            if (!query || query.startsWith('http') || query.includes('.') || query.length < 2) {
                setSuggestions([]);
                return;
            }

            try {
                // Use Main Process proxy to avoid CORS
                const data = await window.electron.search.suggest(query);
                // data format: ["query", ["sug1", "sug2", ...], ...]
                if (Array.isArray(data) && Array.isArray(data[1])) {
                    setSuggestions(data[1].slice(0, 5));
                }
            } catch (e) {
                // Silent fail
            }
        };

        const timeoutId = setTimeout(() => {
            if (activeTab && inputUrl !== activeTab.url) {
                fetchSuggestions();
            }
        }, 200); // Debounce 200ms

        return () => clearTimeout(timeoutId);
    }, [inputUrl, activeTab]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > -1 ? prev - 1 : prev));
        } else if (e.key === 'Enter' && activeTab) {
            e.preventDefault();
            let url = (selectedIndex >= 0 ? suggestions[selectedIndex] : inputUrl).trim();
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

            dispatch({ type: 'LOAD_URL', payload: { id: activeTab.id, url } });
            setShowSuggestions(false);
            setSelectedIndex(-1);
            if (inputRef.current) inputRef.current.blur();
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
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
        <div className="flex items-center z-10 relative overflow-visible w-full">

            {/* Privacy Shield Popover */}
            <PrivacyShield
                stats={activeTab?.blockedStats}
                isVisible={showShield}
                onClose={() => setShowShield(false)}
                onToggleProtection={(enabled) => console.log('Toggle Protection:', enabled)} // Placeholder for now
                protectionEnabled={true}
            />

            {/* Navigation Buttons Removed - Controlled by Toolbar */}

            <div className={`flex-1 w-full bg-underlay-bg rounded-md h-8 flex items-center px-2 gap-2 border border-underlay-border focus-within:border-underlay-accent/50 transition-colors shadow-inner relative ${activeTab?.incognito ? 'bg-zinc-900 border-zinc-700 shadow-[0_0_15px_rgba(0,0,0,0.5)]' : ''}`}>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-underlay-text/5 p-1 rounded non-draggable" onClick={() => setShowCertViewer(!showCertViewer)}>
                    {activeTab?.incognito ? (
                        <VenetianMask size={14} className="text-zinc-400" />
                    ) : (
                        <div className="flex items-center gap-1" onClick={(e) => { e.stopPropagation(); setShowShield(!showShield); }}>
                            <ShieldCheck size={14} className={activeTab?.blockedStats && (activeTab.blockedStats.trackers + activeTab.blockedStats.ads) > 0 ? "text-indigo-400" : "text-underlay-text/40"} />
                            {activeTab?.blockedStats && (activeTab.blockedStats.trackers + activeTab.blockedStats.ads) > 0 && (
                                <span className="text-[10px] font-bold text-indigo-400">{activeTab.blockedStats.trackers + activeTab.blockedStats.ads}</span>
                            )}
                        </div>
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
                    ref={inputRef}
                    className="bg-transparent border-none outline-none flex-1 w-full text-xs text-underlay-text placeholder-underlay-text/20 font-mono non-draggable select-text"
                    value={inputUrl}
                    onChange={(e) => {
                        setInputUrl(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                />

                <button
                    onClick={toggleBookmark}
                    className={`p-1 rounded-md transition-colors non-draggable ${isBookmarked ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-underlay-text/20 hover:text-underlay-text/60 hover:bg-underlay-text/5'}`}
                >
                    <Star size={14} fill={isBookmarked ? "currentColor" : "none"} />
                </button>

                <button
                    onClick={() => {
                        if (activeTab) {
                            dispatch({ type: 'UPDATE_TAB', payload: { id: activeTab.id, data: { readerActive: !activeTab.readerActive } } });
                        }
                    }}
                    className={`p-1 rounded-md transition-colors non-draggable ${activeTab?.readerActive ? 'text-blue-400 bg-blue-400/10' : 'text-underlay-text/20 hover:text-underlay-text/60 hover:bg-underlay-text/5'}`}
                    title="Toggle Reader View"
                >
                    <BookOpen size={14} />
                </button>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-underlay-surface border border-underlay-border rounded-md shadow-2xl py-1 z-50 overflow-hidden non-draggable">
                        {suggestions.map((sug, i) => (
                            <div
                                key={i}
                                className={`px-3 py-2 text-xs cursor-pointer flex items-center gap-2 ${i === selectedIndex ? 'bg-underlay-accent/20 text-underlay-accent' : 'hover:bg-white/5 text-underlay-text'}`}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent focus loss
                                    dispatch({ type: 'LOAD_URL', payload: { id: activeTab!.id, url: 'https://google.com/search?q=' + encodeURIComponent(sug) } });
                                    setShowSuggestions(false);
                                }}
                            >
                                <span className="opacity-50">Is this what you're looking for?</span>
                                <span className="font-medium">{sug}</span>
                            </div>
                        ))}
                    </div>
                )}
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

// NavButton removed


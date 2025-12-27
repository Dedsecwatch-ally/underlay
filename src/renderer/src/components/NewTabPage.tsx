
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Compass, Activity, Youtube, Clapperboard, MonitorPlay, Tv, Sparkles, Github, Cloud, VenetianMask, Mail, HardDrive, FileText, Calendar, MapPin, Image as ImageIcon, Languages, WifiOff, Twitter, Instagram, Facebook, ShoppingBag, Music, MessageCircle, Bot } from 'lucide-react';

import { useBrowser } from '../context/BrowserContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePrivacyStats, formatBytes } from '../hooks/usePrivacyStats';

// ... (keep wallpapers) ...
import { CUSTOM_WALLPAPERS } from '../constants/wallpapers';

// Animation Variants for Staggered Entrance
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            delayChildren: 0.3,
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0, filter: 'blur(10px)' },
    visible: {
        y: 0,
        opacity: 1,
        filter: 'blur(0px)',
        transition: { type: 'spring' as any, damping: 20, stiffness: 100 }
    }
};

export function NewTabPage({ onNavigate, incognito }: { onNavigate: (url: string) => void; incognito?: boolean }) {
    const { state } = useBrowser();
    const isOnline = useOnlineStatus();
    // const fps = useFPS(); (Removed)
    const stats = usePrivacyStats();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [wallpaper, setWallpaper] = useState(() => {
        // Initial Rotation Logic
        const storedIndex = localStorage.getItem('wallpaperIndex');
        let lastIndex = storedIndex ? parseInt(storedIndex, 10) : -1;

        // Safety check
        if (isNaN(lastIndex) || lastIndex < -1 || lastIndex >= CUSTOM_WALLPAPERS.length) {
            lastIndex = -1;
        }

        const nextIndex = (lastIndex + 1) % CUSTOM_WALLPAPERS.length;
        localStorage.setItem('wallpaperIndex', nextIndex.toString());

        // Notify global preloader
        window.dispatchEvent(new CustomEvent('wallpaper-changed', { detail: { index: nextIndex } }));

        return CUSTOM_WALLPAPERS[nextIndex];
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    useEffect(() => {
        const fetchSuggestions = async () => {
            const query = searchQuery.trim();
            if (!query || query.startsWith('http') || query.includes('.') || query.length < 2) {
                setSuggestions([]);
                return;
            }

            try {
                const data = await window.electron.search.suggest(query);
                if (Array.isArray(data) && Array.isArray(data[1])) {
                    setSuggestions(data[1].slice(0, 5));
                }
            } catch (e) {
                // Silent fail
            }
        };

        const timeoutId = setTimeout(() => {
            fetchSuggestions();
        }, 200);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > -1 ? prev - 1 : prev));
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        } else if (e.key === 'Enter') {
            // Let form submit handle it, but update query if selected
            if (selectedIndex >= 0) {
                e.preventDefault();
                const url = suggestions[selectedIndex];
                onNavigate(`https://google.com/search?q=${encodeURIComponent(url)}`);
            }
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        // Simple search navigation
        let url = searchQuery.trim();
        const hasProtocol = /^https?:\/\//i.test(url);
        const hasDomain = url.includes('.') && !url.includes(' ');

        if (!hasProtocol && !hasDomain) {
            url = `https://google.com/search?q=${encodeURIComponent(url)}`;
        } else if (!hasProtocol && hasDomain) {
            url = `https://${url}`;
        }

        onNavigate(url);
    };

    return (
        <div className="absolute inset-0 flex flex-col text-white overflow-hidden bg-black font-sans selection:bg-cyan-500/30">
            {/* BACKGROUND LAYER */}
            {incognito ? (
                // INCOGNITO BACKGROUND (Darker, Minimal)
                <div className="absolute inset-0 bg-[#0A0A0A]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-[#0A0A0A] to-[#0A0A0A]" />
                    {/* Subtle Pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                </div>
            ) : (
                // BREATHING WALLPAPER LAYER (Normal)
                // STATIC WALLPAPER LAYER (Normal)
                <div className="absolute inset-0 z-0">
                    <img
                        src={wallpaper}
                        alt="Wallpaper"
                        draggable={false}
                        className="w-full h-full object-cover select-none pointer-events-none"
                        onError={(e) => {
                            // Fallback if image fails
                            e.currentTarget.src = CUSTOM_WALLPAPERS[0];
                        }}
                    />
                    {/* Cinematic Vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30 opacity-40 pointer-events-none select-none" />
                </div>
            )}





            // ... (existing code)

            {/* TOP WIDGETS */}
            {!incognito && (
                <>
                    <GoogleAppsWidget onNavigate={onNavigate} />
                    <CryptoWidget />
                </>
            )}




            {/* CENTER CONTENT CONTAINER */}
            <div className="z-10 relative flex-1 flex flex-col items-center justify-center -mt-16 w-full">


                {/* CENTER CONTENT */}
                <div className="flex flex-col items-center justify-center mb-8 text-center">
                    {incognito ? (
                        <div className="flex flex-col items-center gap-6 mb-4">
                            <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-2 shadow-2xl border border-white/5">
                                <VenetianMask size={48} className="text-zinc-400" strokeWidth={1.5} />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">You are Incognito</h1>
                                <p className="text-zinc-500 max-w-md mx-auto text-sm leading-relaxed">
                                    Your browsing history, cookies, and site data will not be saved.
                                    Downloads and bookmarks created will still be kept.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-6xl font-light tracking-tighter text-white select-none drop-shadow-lg">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </h1>
                            <div className="text-[10px] font-semibold tracking-[0.8em] uppercase text-white/80 mt-2 drop-shadow-md">
                                {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </div>
                        </>
                    )}
                </div>

                {/* FAVORITES ROW - Expanded Grid */}
                <div className="flex flex-wrap gap-6 mb-12 justify-center max-w-4xl px-4">
                    <FavoriteIcon
                        icon={<Github strokeWidth={1.5} size={28} />}
                        label="GitHub"
                        url="https://github.com"
                        onClick={onNavigate}
                        bgColor="bg-[#24292e]"
                    />
                    <FavoriteIcon
                        icon={<Cloud strokeWidth={1.5} size={28} />}
                        label="Vercel"
                        url="https://vercel.com"
                        onClick={onNavigate}
                        bgColor="bg-black"
                    />
                    <FavoriteIcon
                        icon={<Youtube strokeWidth={1.5} size={28} />}
                        label="YouTube"
                        url="https://youtube.com"
                        onClick={onNavigate}
                        bgColor="bg-[#FF0000]"
                    />
                    <FavoriteIcon
                        icon={<Clapperboard strokeWidth={1.5} size={28} />}
                        label="Netflix"
                        url="https://netflix.com"
                        onClick={onNavigate}
                        bgColor="bg-[#E50914]"
                    />
                    <FavoriteIcon
                        icon={<MonitorPlay strokeWidth={1.5} size={28} />}
                        label="Prime Video"
                        url="https://primevideo.com"
                        onClick={onNavigate}
                        bgColor="bg-[#00A8E1]"
                    />
                    <FavoriteIcon
                        icon={<Tv strokeWidth={1.5} size={28} />}
                        label="Hotstar"
                        url="https://hotstar.com"
                        onClick={onNavigate}
                        bgColor="bg-[#133ba2]"
                    />
                    <FavoriteIcon
                        icon={<Sparkles strokeWidth={1.5} size={28} />}
                        label="Gemini"
                        url="https://gemini.google.com"
                        onClick={onNavigate}
                        bgColor="bg-gradient-to-br from-[#4E86F1] to-[#9B62E0]"
                    />
                </div>

                {/* HERO SEARCH BAR - Smaller, tighter */}
                <form
                    onSubmit={handleSearch}
                    className="w-full max-w-2xl px-6 relative group non-draggable"
                >
                    {/* Glowing Blur Behind - REMOVED for max performance */}
                    {/* <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-fuchsia-500/20 to-blue-500/20 rounded-full blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" /> */}

                    <div className="relative">
                        {/* Glass Background - Optimization: Removed blur entirely, using solid semi-transparent */}
                        <div className="absolute inset-0 bg-black/40 border border-white/10 rounded-full shadow-lg transition-colors duration-200 group-focus-within:bg-black/60 group-focus-within:border-white/30" />

                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/30 group-focus-within:text-white transition-colors duration-500">
                            <Search size={18} strokeWidth={1.5} />
                        </div>

                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a URL or search..."
                            className="relative w-full bg-transparent border-none py-4 pl-12 pr-6 text-lg text-white placeholder-white/50 outline-none font-light tracking-wide rounded-full select-text"
                            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                            autoFocus
                        />

                        {/* Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden non-draggable">
                                {suggestions.map((sug, i) => (
                                    <div
                                        key={i}
                                        className={`px-6 py-3 text-sm cursor-pointer flex items-center gap-3 transition-colors ${i === selectedIndex ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/70 hover:text-white'}`}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            onNavigate(`https://google.com/search?q=${encodeURIComponent(sug)}`);
                                        }}
                                    >
                                        <Search size={14} className="opacity-50" />
                                        <span>{sug}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Helper Text */}
                    <div className="absolute top-full left-0 w-full text-center mt-3 opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 delay-100">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">Press Enter to Search</span>
                    </div>

                    {!isOnline && (
                        <div className="absolute top-full left-0 w-full flex items-center justify-center mt-8">
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
                                <WifiOff size={14} className="text-red-400" />
                                <span className="text-xs font-medium text-red-200">Offline Mode</span>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {/* BOTTOM WIDGETS */}
            {!incognito && (
                <div className="z-10 relative px-12 pb-6 flex items-end justify-between w-full h-24">

                    {/* PRIVACY STATS BAR (CENTER) */}
                    <div className="flex items-center gap-8 px-8 py-3 bg-black/40 backdrop-blur-2xl rounded-2xl border border-white/5 mx-auto">
                        <StatItem label="Bandwidth Saved" value={formatBytes(stats.bandwidthSavedBytes)} color="text-cyan-400" />
                        <div className="w-[1px] h-8 bg-white/10" />
                        <StatItem label="Trackers Blocked" value={stats.trackersBlocked.toLocaleString()} color="text-red-400" />
                        <div className="w-[1px] h-8 bg-white/10" />
                        <StatItem label="Ads Blocked" value={stats.adsBlocked.toLocaleString()} color="text-yellow-400" />
                    </div>

                </div>
            )}
        </div>
    );
}

const FavoriteIcon = React.memo(function FavoriteIcon({ icon, label, url, onClick, bgColor = "bg-zinc-800", glowColor = "shadow-white/10" }: { icon: any, label: string, url: string, onClick: (url: string) => void, bgColor?: string, glowColor?: string }) {
    return (
        <button
            onClick={() => onClick(url)}
            className="group flex flex-col items-center gap-3 relative non-draggable"
        >

            <div className={`w-16 h-16 rounded-[20px] ${bgColor} border border-white/10 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-lg text-white`}>
                {icon}
            </div>

            {/* Label */}
            <span className="text-[10px] font-medium tracking-widest uppercase text-white/50 group-hover:text-white transition-colors duration-200 absolute -bottom-6 opacity-0 group-hover:opacity-100 group-hover:bottom-[-1.5rem]">
                {label}
            </span>
        </button>
    )
});

const StatItem = React.memo(function StatItem({ label, value, color }: { label: string, value: string, color: string }) {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        // Parse numeric part
        const numericPart = parseFloat(value.replace(/,/g, '').replace(/[^\d.]/g, ''));
        if (isNaN(numericPart)) return;

        const suffix = value.replace(/[\d,.]/g, '').trim();
        const duration = 2000;
        const steps = 60;
        const stepTime = duration / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += numericPart / steps;
            if (current >= numericPart) {
                setDisplayValue(value);
                clearInterval(timer);
            } else {
                // Formatting logic
                let formatted = Math.floor(current).toLocaleString();
                if (value.includes('.')) {
                    formatted = current.toFixed(2);
                }
                setDisplayValue(`${formatted} ${suffix}`);
            }
        }, stepTime);

        return () => clearInterval(timer);
    }, [value]);

    return (
        <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-1">{label}</span>
            <span className={`text-lg font-light tracking-wide ${color} drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>{displayValue}</span>
        </div>
    )
});

// --- NEW WIDGETS ---



function CryptoWidget() {
    const [prices, setPrices] = useState({ btc: 98420, eth: 3450, sol: 145 });

    useEffect(() => {
        const interval = setInterval(() => {
            setPrices(prev => ({
                btc: prev.btc + (Math.random() - 0.5) * 50,
                eth: prev.eth + (Math.random() - 0.5) * 10,
                sol: prev.sol + (Math.random() - 0.5) * 2
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute top-8 right-8 flex gap-6 z-20">
            <CryptoItem label="BTC" value={prices.btc} />
            <CryptoItem label="ETH" value={prices.eth} />
            <CryptoItem label="SOL" value={prices.sol} />
        </div>
    );
}

function CryptoItem({ label, value }: { label: string, value: number }) {
    return (
        <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold text-white/30 tracking-widest">{label}</span>
            <span className="text-xs font-mono text-white/80">${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
    );
}

function GoogleAppsWidget({ onNavigate }: { onNavigate: (url: string) => void }) {
    const [expanded, setExpanded] = useState(false);
    const apps = [
        { name: 'Google', url: 'https://google.com', icon: <Search size={20} />, color: 'text-blue-400' },
        { name: 'Gmail', url: 'https://mail.google.com', icon: <Mail size={20} />, color: 'text-red-500' },
        { name: 'YouTube', url: 'https://youtube.com', icon: <Youtube size={20} />, color: 'text-red-600' },
        { name: 'Drive', url: 'https://drive.google.com', icon: <HardDrive size={20} />, color: 'text-green-500' },
        { name: 'Docs', url: 'https://docs.google.com', icon: <FileText size={20} />, color: 'text-blue-500' },
        { name: 'Calendar', url: 'https://calendar.google.com', icon: <Calendar size={20} />, color: 'text-blue-400' },
        { name: 'Maps', url: 'https://maps.google.com', icon: <MapPin size={20} />, color: 'text-green-400' },
        { name: 'Photos', url: 'https://photos.google.com', icon: <ImageIcon size={20} />, color: 'text-yellow-500' },
        { name: 'Translate', url: 'https://translate.google.com', icon: <Languages size={20} />, color: 'text-blue-300' },
    ];

    return (
        <div className="absolute top-8 left-8 z-20">
            <AnimatePresence>
                {expanded ? (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, originX: 0, originY: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-black/95 border border-white/20 rounded-2xl p-4 shadow-2xl relative non-draggable"
                    >
                        {/* Close Button / Header */}
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Google Apps</h3>
                            <button
                                onClick={() => setExpanded(false)}
                                className="w-5 h-5 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white/50 hover:text-white transition-colors"
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {apps.map(app => (
                                <button
                                    key={app.name}
                                    onClick={() => { onNavigate(app.url); setExpanded(false); }}
                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 hover:scale-110 transition-all group relative shadow-lg shadow-black/20"
                                >
                                    <div className={app.color + " drop-shadow-md"}>
                                        {app.icon}
                                    </div>

                                    {/* Tooltip Pop-up */}
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 shadow-xl z-10 translate-y-2 group-hover:translate-y-0 duration-200">
                                        {app.name}
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 rotate-45 border-t border-l border-white/10"></div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.button
                        layoutId="google-folder"
                        onClick={() => setExpanded(true)}
                        className="w-14 h-14 bg-[#313131] border border-white/10 rounded-2xl flex items-center justify-center hover:bg-[#313131]/80 hover:scale-105 transition-all group shadow-xl non-draggable"
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="grid grid-cols-2 gap-1 p-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/80"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500/80"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/80"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500/80"></div>
                        </div>
                        <div className="absolute -bottom-6 text-[10px] font-medium text-white/40 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            Google
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}



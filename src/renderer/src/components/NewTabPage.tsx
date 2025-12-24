
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Compass, Activity, Youtube, Clapperboard, MonitorPlay, Tv, Sparkles, Github, Cloud } from 'lucide-react';

import { useBrowser } from '../context/BrowserContext';
import { usePrivacyStats, formatBytes } from '../hooks/usePrivacyStats';

// ULTRA PREMIUIM 4K WALLPAPERS - "Underlay Aesthetic"
const CUSTOM_WALLPAPERS = [
    'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=90&w=3840&auto=format&fit=crop', // Deep Pink/Blue Fluid
    'https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=90&w=3840&auto=format&fit=crop', // Dark Minimal Geometric
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=90&w=3840&auto=format&fit=crop', // Liquid Dark
    'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=90&w=3840&auto=format&fit=crop', // Minimalist 3D Geometry
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=90&w=3840&auto=format&fit=crop', // Dark Oil

    // Scenery & Nature
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=90&w=3840&auto=format&fit=crop', // Epic Mountains
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=90&w=3840&auto=format&fit=crop', // Japan Night (Anime Vibe)

    // Cars
    'https://images.unsplash.com/photo-1532906616428-dab6a8775f98?q=90&w=3840&auto=format&fit=crop', // F1 CAr
    'https://images.unsplash.com/photo-1544614471-32906d3f2b8c?q=90&w=3840&auto=format&fit=crop', // Hypercar (Lamborghini)
    'https://images.unsplash.com/photo-1614200179396-2bdb77ebf819?q=90&w=3840&auto=format&fit=crop', // Dark Maclaren

    // Anime / Cyberpunk Aesthetic
    'https://images.unsplash.com/photo-1563089145681-4a51e712aadd?q=90&w=3840&auto=format&fit=crop', // Neon Cyberpunk City
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=90&w=3840&auto=format&fit=crop', // Anime Style Street
];

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

export function NewTabPage({ onNavigate }: { onNavigate: (url: string) => void }) {
    const { state } = useBrowser();
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
        return CUSTOM_WALLPAPERS[nextIndex];
    });

    // Preload Next Wallpaper Optimization (with cleanup)
    useEffect(() => {
        const currentIndex = CUSTOM_WALLPAPERS.indexOf(wallpaper);
        const nextIndex = (currentIndex + 1) % CUSTOM_WALLPAPERS.length;

        // Use a new Image for caching, but allow it to be garbage collected easily
        const img = new Image();
        img.src = CUSTOM_WALLPAPERS[nextIndex];

        return () => {
            img.onload = null;
            img.onerror = null;
            img.src = ''; // Detach to help GC
        };
    }, [wallpaper]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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
            {/* BREATHING WALLPAPER LAYER */}
            <AnimatePresence mode='popLayout'>
                <motion.div
                    key={wallpaper}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 z-0"
                >
                    <motion.img
                        src={wallpaper}
                        alt="Wallpaper"
                        decoding="async"
                        initial={{ scale: 1.05, filter: 'brightness(0.5)' }}
                        animate={{
                            scale: 1,
                            filter: ['brightness(0.8)', 'brightness(1)']
                        }}
                        transition={{
                            scale: { duration: 6, ease: "easeOut" },
                            filter: { duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
                        }}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // Fallback if image fails
                            e.currentTarget.src = CUSTOM_WALLPAPERS[0];
                        }}
                    />
                    {/* Cinematic Vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 opacity-80" />
                </motion.div>
            </AnimatePresence>



            {/* TOP WIDGETS */}
            <CryptoWidget />




            {/* CENTER CONTENT CONTAINER */}
            <motion.div
                className="z-10 relative flex-1 flex flex-col items-center justify-center -mt-16 w-full"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >


                {/* CENTERED CLOCK - Minimal & Aesthetic */}
                <motion.div
                    variants={itemVariants}
                    className="flex flex-col items-center justify-center mb-8 text-center"
                >
                    <h1 className="text-6xl font-light tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white/90 via-white/50 to-white/10 backdrop-blur-sm select-none">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </h1>
                    <div className="text-[10px] font-semibold tracking-[0.8em] uppercase text-white/30 mt-2 mix-blend-plus-lighter">
                        {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                </motion.div>

                {/* FAVORITES ROW - Smaller now */}
                <motion.div variants={itemVariants} className="flex gap-6 mb-12 flex-wrap justify-center max-w-3xl">
                    <FavoriteIcon
                        icon={<Github strokeWidth={1.5} size={20} />}
                        label="GitHub"
                        url="https://github.com"
                        onClick={onNavigate}
                        color="text-white/70 group-hover:text-white"
                        glowColor="group-hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                    />
                    <FavoriteIcon
                        icon={<Cloud strokeWidth={1.5} size={20} />}
                        label="Vercel"
                        url="https://vercel.com"
                        onClick={onNavigate}
                        color="text-white/70 group-hover:text-white"
                        glowColor="group-hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                    />
                    <FavoriteIcon
                        icon={<Youtube strokeWidth={1.5} size={20} />}
                        label="YouTube"
                        url="https://youtube.com"
                        onClick={onNavigate}
                        color="text-white/70 group-hover:text-red-500"
                        glowColor="group-hover:shadow-[0_0_40px_rgba(239,68,68,0.4)]"
                    />
                    <FavoriteIcon
                        icon={<Clapperboard strokeWidth={1.5} size={20} />}
                        label="Netflix"
                        url="https://netflix.com"
                        onClick={onNavigate}
                        color="text-white/70 group-hover:text-red-600"
                        glowColor="group-hover:shadow-[0_0_40px_rgba(220,38,38,0.4)]"
                    />
                    <FavoriteIcon
                        icon={<MonitorPlay strokeWidth={1.5} size={20} />}
                        label="Prime Video"
                        url="https://primevideo.com"
                        onClick={onNavigate}
                        color="text-white/70 group-hover:text-sky-400"
                        glowColor="group-hover:shadow-[0_0_40px_rgba(56,189,248,0.4)]"
                    />
                    <FavoriteIcon
                        icon={<Tv strokeWidth={1.5} size={20} />}
                        label="Hotstar"
                        url="https://hotstar.com"
                        onClick={onNavigate}
                        color="text-white/70 group-hover:text-blue-500"
                        glowColor="group-hover:shadow-[0_0_40px_rgba(59,130,246,0.4)]"
                    />
                    <FavoriteIcon
                        icon={<Sparkles strokeWidth={1.5} size={20} />}
                        label="Gemini"
                        url="https://gemini.google.com"
                        onClick={onNavigate}
                        color="text-white/70 group-hover:text-fuchsia-400"
                        glowColor="group-hover:shadow-[0_0_40px_rgba(232,121,249,0.4)]"
                    />
                </motion.div>

                {/* HERO SEARCH BAR - Smaller, tighter */}
                <motion.form
                    variants={itemVariants}
                    onSubmit={handleSearch}
                    className="w-full max-w-2xl px-6 relative group"
                >
                    {/* Glowing Blur Behind - VIBRANT */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-fuchsia-500/20 to-blue-500/20 rounded-full blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />

                    <div className="relative">
                        {/* Glass Background - Opacity 20% */}
                        <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl rounded-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-500 group-focus-within:bg-white/10 group-focus-within:border-white/20 group-focus-within:shadow-[0_0_60px_rgba(34,211,238,0.15)]" />

                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/30 group-focus-within:text-white transition-colors duration-500">
                            <Search size={18} strokeWidth={1.5} />
                        </div>

                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Type a URL or search..."
                            className="relative w-full bg-transparent border-none py-4 pl-12 pr-6 text-lg text-white placeholder-white/50 outline-none font-light tracking-wide rounded-full"
                            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                            autoFocus
                        />
                    </div>

                    {/* Helper Text */}
                    <div className="absolute top-full left-0 w-full text-center mt-3 opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 delay-100">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">Press Enter to Search</span>
                    </div>
                </motion.form>
            </motion.div>

            {/* BOTTOM WIDGETS */}
            <div className="z-10 relative px-12 pb-6 flex items-end justify-between w-full h-24">

                {/* PRIVACY STATS BAR (CENTER) */}
                <motion.div
                    initial={{ y: 20, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 1.6, duration: 0.8 }}
                    className="flex items-center gap-8 px-8 py-3 bg-black/40 backdrop-blur-2xl rounded-2xl border border-white/5 mx-auto"
                >
                    <StatItem label="Bandwidth Saved" value={formatBytes(stats.bandwidthSavedBytes)} color="text-cyan-400" />
                    <div className="w-[1px] h-8 bg-white/10" />
                    <StatItem label="Trackers Blocked" value={stats.trackersBlocked.toLocaleString()} color="text-red-400" />
                    <div className="w-[1px] h-8 bg-white/10" />
                    <StatItem label="Ads Blocked" value={stats.adsBlocked.toLocaleString()} color="text-yellow-400" />
                </motion.div>

            </div>
        </div>
    );
}

const FavoriteIcon = React.memo(function FavoriteIcon({ icon, label, url, onClick, color = "text-white", glowColor = "shadow-white/10" }: { icon: any, label: string, url: string, onClick: (url: string) => void, color?: string, glowColor?: string }) {
    return (
        <motion.button
            whileHover={{ y: -5, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onClick(url)}
            className="group flex flex-col items-center gap-3 relative"
        >

            <div className={`w-16 h-16 rounded-[20px] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-2xl flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-500 group-hover:bg-white/10 group-hover:border-white/20 ${color} ${glowColor}`}>
                {icon}
            </div>

            {/* Label with shiny hover effect */}
            <span className="text-[10px] font-medium tracking-widest uppercase text-white/30 group-hover:text-white transition-colors duration-300 absolute -bottom-6 opacity-0 group-hover:opacity-100 group-hover:bottom-[-1.5rem]">
                {label}
            </span>
        </motion.button>
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



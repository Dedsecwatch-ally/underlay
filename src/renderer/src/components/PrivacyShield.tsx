import React from 'react';
import { Shield, ShieldAlert, Eye, EyeOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrivacyShieldProps {
    stats: {
        ads: number;
        trackers: number;
        fingerprinters: number;
        cryptominers: number;
        social: number;
        history: Array<{ url: string; domain: string; type: string; timestamp: number }>;
    } | undefined;
    isVisible: boolean;
    onClose: () => void;
    onToggleProtection: (enabled: boolean) => void;
    protectionEnabled: boolean;
}

export function PrivacyShield({ stats, isVisible, onClose, onToggleProtection, protectionEnabled }: PrivacyShieldProps) {
    if (!isVisible) return null;

    const totalBlocked = stats ? (stats.ads + stats.trackers + stats.fingerprinters + stats.cryptominers + stats.social) : 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute top-12 left-4 z-50 w-80 bg-[#1e1e20] border border-[#2d2d30] rounded-xl shadow-2xl overflow-hidden font-sans text-sm"
            >
                {/* Header */}
                <div className={`p-4 ${protectionEnabled ? 'bg-gradient-to-br from-indigo-600/20 to-purple-600/20' : 'bg-red-500/10'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-full ${protectionEnabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-red-500/20 text-red-400'}`}>
                                {protectionEnabled ? <Shield size={20} /> : <ShieldAlert size={20} />}
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">{protectionEnabled ? 'Enhanced Protection' : 'Protection Disabled'}</h3>
                                <p className="text-xs text-white/50">{protectionEnabled ? 'Strict Mode Active' : 'Site may track you'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-2xl font-bold text-white tabular-nums">{totalBlocked}</span>
                            <span className="text-xs text-white/40">items blocked</span>
                        </div>

                        <button
                            onClick={() => onToggleProtection(!protectionEnabled)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${protectionEnabled ? 'border-white/10 hover:bg-white/10 text-white/80' : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'}`}
                        >
                            {protectionEnabled ? 'Turn OFF' : 'Turn ON'}
                        </button>
                    </div>
                </div>

                {/* Categories */}
                <div className="p-4 space-y-3">
                    <CategoryRow label="Social Trackers" count={stats?.social || 0} color="text-blue-400" />
                    <CategoryRow label="Cross-Site Cookies" count={stats?.trackers || 0} color="text-yellow-400" />
                    <CategoryRow label="Fingerprinters" count={stats?.fingerprinters || 0} color="text-orange-400" />
                    <CategoryRow label="Cryptominers" count={stats?.cryptominers || 0} color="text-red-400" />
                    <CategoryRow label="Ads & Annotations" count={stats?.ads || 0} color="text-white/40" />
                </div>

                {/* Recent Activity */}
                <div className="bg-[#18181a] p-3 border-t border-[#2d2d30] max-h-32 overflow-y-auto">
                    <h4 className="text-xs font-semibold text-white/30 mb-2 uppercase tracking-wider">Recent Activity</h4>
                    <div className="space-y-1">
                        {stats?.history && stats.history.slice(-5).reverse().map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-[10px] text-white/60">
                                <span className="truncate max-w-[180px]">{item.domain}</span>
                                <span className={`px-1 rounded bg-white/5 ${getColorForType(item.type)}`}>{item.type}</span>
                            </div>
                        ))}
                        {(!stats?.history || stats.history.length === 0) && (
                            <div className="text-center text-xs text-white/20 py-2">No activity detected</div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

function CategoryRow({ label, count, color }: { label: string, count: number, color: string }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-white/70">{label}</span>
            <span className={`font-mono text-xs ${count > 0 ? color : 'text-white/20'}`}>{count}</span>
        </div>
    );
}

function getColorForType(type: string) {
    switch (type) {
        case 'Social': return 'text-blue-400';
        case 'Tracker': return 'text-yellow-400';
        case 'Fingerprinter': return 'text-orange-400';
        case 'Cryptominer': return 'text-red-400';
        default: return 'text-white/40';
    }
}

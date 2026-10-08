import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Lock, LockOpen, ShieldCheck, ShieldOff, VenetianMask } from 'lucide-react';
import type { BlockedStats } from '../store/browserStore';
import { hostnameOf } from '../utils/omnibox';

interface SiteInfoProps {
    url: string;
    incognito: boolean;
    stats: BlockedStats | undefined;
    shieldsEnabled: boolean;
    onToggleShields: (enabled: boolean) => void;
    onClose: () => void;
}

const CATEGORIES: Array<{ key: keyof Omit<BlockedStats, 'history'>; label: string }> = [
    { key: 'trackers', label: 'Trackers' },
    { key: 'ads', label: 'Ads' },
    { key: 'fingerprinters', label: 'Fingerprinters' },
    { key: 'social', label: 'Social trackers' },
    { key: 'cryptominers', label: 'Cryptominers' }
];

/** Safari-style site information popover anchored to the address bar. */
export function PrivacyShield({ url, incognito, stats, shieldsEnabled, onToggleShields, onClose }: SiteInfoProps) {
    const ref = useRef<HTMLDivElement>(null);
    const host = hostnameOf(url);
    const secure = url.startsWith('https:');
    const total = stats ? CATEGORIES.reduce((sum, c) => sum + stats[c.key], 0) : 0;
    const blockedDomains = stats ? [...new Set(stats.history.map(h => h.domain))].slice(-8).reverse() : [];

    useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        // Defer so the click that opened us doesn't immediately close us.
        const timer = setTimeout(() => window.addEventListener('pointerdown', onPointerDown));
        window.addEventListener('keydown', onKey);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className="popover absolute top-full left-0 mt-2 w-[300px] z-50 overflow-hidden text-underlay-text origin-top-left"
            role="dialog"
            aria-label="Site information"
        >
            <div className="px-4 pt-4 pb-3">
                <div className="text-[13px] font-semibold truncate">{host || 'This page'}</div>
                <div className="flex items-center gap-1.5 mt-1 text-[12px] text-underlay-text/60">
                    {incognito ? (
                        <><VenetianMask size={13} /> Private tab — nothing from it is saved</>
                    ) : secure ? (
                        <><Lock size={12} /> Connection is secure</>
                    ) : (
                        <><LockOpen size={12} className="text-[#ff9f0a]" /><span className="text-[#ff9f0a]">Connection is not secure</span></>
                    )}
                </div>
            </div>

            <div className="mx-3 mb-3 rounded-lg bg-underlay-text/[0.05] px-3 py-2.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[13px] font-medium">
                        {shieldsEnabled ? <ShieldCheck size={15} className="text-[#30d158]" /> : <ShieldOff size={15} className="text-underlay-text/40" />}
                        Shields
                    </div>
                    <Switch checked={shieldsEnabled} onChange={onToggleShields} label="Block trackers and ads" />
                </div>
                <p className="mt-1 text-[11.5px] leading-snug text-underlay-text/50">
                    {!shieldsEnabled
                        ? 'Trackers and ads are not being blocked.'
                        : total === 0
                            ? 'No trackers found on this page.'
                            : `Prevented ${total} ${total === 1 ? 'tracker' : 'trackers'} from profiling you on this page.`}
                </p>
            </div>

            {shieldsEnabled && total > 0 && (
                <div className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                        {CATEGORIES.filter(c => stats![c.key] > 0).map(c => (
                            <div key={c.key} className="flex justify-between text-underlay-text/70">
                                <span>{c.label}</span>
                                <span className="tabular-nums font-medium text-underlay-text">{stats![c.key]}</span>
                            </div>
                        ))}
                    </div>
                    {blockedDomains.length > 0 && (
                        <div className="mt-3 pt-3 border-t hairline">
                            <div className="section-label mb-1.5">Recently blocked</div>
                            <ul className="space-y-0.5 text-[12px] text-underlay-text/60 font-mono">
                                {blockedDomains.map(domain => <li key={domain} className="truncate">{domain}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation();
                onChange(!checked);
            }}
            className={`relative shrink-0 w-[38px] h-[22px] rounded-full transition-colors duration-200 ease-apple disabled:opacity-40 ${checked ? 'bg-[#30d158]' : 'bg-underlay-text/20'}`}
        >
            <span
                className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-apple"
                style={{ transform: checked ? 'translateX(16px)' : 'none' }}
            />
        </button>
    );
}

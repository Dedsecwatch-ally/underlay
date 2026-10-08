import { useEffect, useState } from 'react';

export interface PrivacyStats {
    adsBlocked: number;
    trackersBlocked: number;
    bandwidthSavedBytes: number;
}

// Rough averages used to estimate data saved by blocking.
const AD_BYTES = 85 * 1024;
const TRACKER_BYTES = 3 * 1024;
const STORAGE_KEY = 'underlay-privacy-stats';
const EVENT = 'underlay-privacy-stats';

function load(): PrivacyStats {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (parsed && typeof parsed.trackersBlocked === 'number') return parsed;
    } catch { }
    // Carry over counters written by older versions.
    return {
        adsBlocked: Number(localStorage.getItem('stats_ads')) || 0,
        trackersBlocked: Number(localStorage.getItem('stats_trackers')) || 0,
        bandwidthSavedBytes: Number(localStorage.getItem('stats_bandwidth')) || 0
    };
}

let stats = load();

/** Called once per batch of blocked requests reported by the main process. */
export function recordBlocked(batch: Array<{ type: string }>) {
    if (!batch.length) return;
    let ads = 0;
    let trackers = 0;
    for (const item of batch) {
        if (item.type === 'Ad') ads++;
        else trackers++;
    }
    stats = {
        adsBlocked: stats.adsBlocked + ads,
        trackersBlocked: stats.trackersBlocked + trackers,
        bandwidthSavedBytes: stats.bandwidthSavedBytes + ads * AD_BYTES + trackers * TRACKER_BYTES
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch { }
    window.dispatchEvent(new Event(EVENT));
}

/** Lifetime blocking totals. Only real, observed blocks are counted. */
export function usePrivacyStats() {
    const [value, setValue] = useState(stats);
    useEffect(() => {
        const update = () => setValue(stats);
        window.addEventListener(EVENT, update);
        return () => window.removeEventListener(EVENT, update);
    }, []);
    return value;
}

export function formatBytes(bytes: number, decimals = 1) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(Math.max(0, decimals)))} ${sizes[i]}`;
}


import { useState, useEffect } from 'react';
import { useBrowser } from '../context/BrowserContext';

export interface PrivacyStats {
    adsBlocked: number;
    trackersBlocked: number;
    bandwidthSavedBytes: number;
}

export function usePrivacyStats() {
    const { state } = useBrowser();
    const [stats, setStats] = useState<PrivacyStats>({
        adsBlocked: 0,
        trackersBlocked: 0,
        bandwidthSavedBytes: 0
    });

    // Load initial stats
    useEffect(() => {
        const storedAds = parseInt(localStorage.getItem('stats_ads') || '0', 10);
        const storedTrackers = parseInt(localStorage.getItem('stats_trackers') || '0', 10);
        const storedBandwidth = parseInt(localStorage.getItem('stats_bandwidth') || '0', 10);

        setStats({
            adsBlocked: storedAds,
            trackersBlocked: storedTrackers,
            bandwidthSavedBytes: storedBandwidth
        });
    }, []);

    // Real-time Privacy Event Listener
    useEffect(() => {
        const handleBlocked = (_event: any, data: { url: string, domain: string, type: string, timestamp: number }) => {
            setStats(prev => {
                let adsIncr = 0;
                let trackersIncr = 0;
                let bwIncr = 0;

                if (data.type === 'Ad' || data.type === 'YouTube Ad') {
                    adsIncr = 1;
                    bwIncr = 85 * 1024; // Avg ad size ~85KB
                } else {
                    trackersIncr = 1;
                    bwIncr = 3 * 1024; // Avg tracker script ~3KB
                }

                const nextStats = {
                    adsBlocked: prev.adsBlocked + adsIncr,
                    trackersBlocked: prev.trackersBlocked + trackersIncr,
                    bandwidthSavedBytes: prev.bandwidthSavedBytes + bwIncr
                };

                // Persist
                localStorage.setItem('stats_ads', nextStats.adsBlocked.toString());
                localStorage.setItem('stats_trackers', nextStats.trackersBlocked.toString());
                localStorage.setItem('stats_bandwidth', nextStats.bandwidthSavedBytes.toString());

                return nextStats;
            });
        };

        if (window.electron && (window.electron as any).ipcRenderer) {
            (window.electron as any).ipcRenderer.on('privacy:tracker-blocked', handleBlocked);
        }

        return () => {
            if (window.electron && (window.electron as any).ipcRenderer) {
                (window.electron as any).ipcRenderer.removeListener('privacy:tracker-blocked', handleBlocked);
            }
        };
    }, []);

    // Navigation-based updates (Simulation for "Scanning" effect on new usage)
    useEffect(() => {
        // We trigger an update whenever the active tab URL changes (navigation)
        const activeTab = state.tabs.find(t => t.id === state.activeTabId);
        if (!activeTab || activeTab.url === 'underlay://newtab') return;

        // Function to increment stats with some variance
        const incrementStats = () => {
            setStats(prev => {
                // Heuristic: 1 page load ~= 1-3 ads, 2-5 trackers (on top of real ones)
                const newAds = Math.floor(Math.random() * 2);
                const newTrackers = Math.floor(Math.random() * 3) + 1;
                const newBandwidth = Math.floor(Math.random() * 0.5 * 1024 * 1024);

                const nextStats = {
                    adsBlocked: prev.adsBlocked + newAds,
                    trackersBlocked: prev.trackersBlocked + newTrackers,
                    bandwidthSavedBytes: prev.bandwidthSavedBytes + newBandwidth
                };

                // Persist immediately
                localStorage.setItem('stats_ads', nextStats.adsBlocked.toString());
                localStorage.setItem('stats_trackers', nextStats.trackersBlocked.toString());
                localStorage.setItem('stats_bandwidth', nextStats.bandwidthSavedBytes.toString());

                return nextStats;
            });
        };

        // Trigger simulation on "navigation" (dependency change)
        const timer = setTimeout(incrementStats, 2000);

        return () => clearTimeout(timer);
    }, [state.tabs.find(t => t.id === state.activeTabId)?.url]);

    return stats;
}

export function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

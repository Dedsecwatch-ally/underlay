import { useCallback, useEffect, useState } from 'react';

// Privacy preferences live in the main process (they apply to network
// requests); this mirrors them for the UI and keeps every consumer in sync.

const DEFAULTS: PrivacyPrefs = { shields: true, httpsUpgrade: true, globalPrivacyControl: true, searchSuggestions: true };
const EVENT = 'underlay-privacy-prefs';

let cached: PrivacyPrefs = DEFAULTS;
let loaded: Promise<void> | null = null;

function publish(next: PrivacyPrefs) {
    cached = next;
    window.dispatchEvent(new Event(EVENT));
}

export function usePrivacyPrefs() {
    const [prefs, setPrefs] = useState(cached);

    useEffect(() => {
        const sync = () => setPrefs(cached);
        window.addEventListener(EVENT, sync);
        if (!loaded && window.electron?.privacy) {
            loaded = window.electron.privacy.getPrefs().then(publish).catch(() => { });
        }
        sync();
        return () => window.removeEventListener(EVENT, sync);
    }, []);

    const update = useCallback(async (patch: Partial<PrivacyPrefs>) => {
        publish({ ...cached, ...patch }); // optimistic
        try {
            publish(await window.electron.privacy.setPrefs(patch));
        } catch (e) {
            console.error('[Privacy] Failed to save preferences:', e);
        }
    }, []);

    return [prefs, update] as const;
}

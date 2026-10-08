import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, MapPin, Bell, Monitor, Clipboard, ExternalLink, Shield, Music, AppWindow, Cookie, Timer } from 'lucide-react';

const KIND_INFO: Record<PermissionKind, { label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = {
    camera: { label: 'use your camera', icon: Camera },
    microphone: { label: 'use your microphone', icon: Mic },
    geolocation: { label: 'know your location', icon: MapPin },
    notifications: { label: 'show notifications', icon: Bell },
    midi: { label: 'use your MIDI devices', icon: Music },
    screen: { label: 'share your screen', icon: Monitor },
    'clipboard-read': { label: 'see text and images copied to the clipboard', icon: Clipboard },
    'open-external': { label: 'open another application', icon: ExternalLink },
    'idle-detection': { label: 'know when you are actively using this device', icon: Timer },
    'window-management': { label: 'manage windows on all your displays', icon: AppWindow },
    'storage-access': { label: 'use cookies and data while embedded on other sites', icon: Cookie }
};

function describe(kinds: PermissionKind[]) {
    if (kinds.includes('camera') && kinds.includes('microphone')) return 'use your camera and microphone';
    return kinds.map(k => KIND_INFO[k]?.label ?? k).join(' and ');
}

function hostOf(origin: string) {
    try {
        return new URL(origin).hostname.replace(/^www\./, '');
    } catch {
        return origin;
    }
}

/** Safari-style permission sheet that drops from the toolbar. */
export const PermissionOverlay: React.FC = () => {
    const [queue, setQueue] = useState<PermissionPrompt[]>([]);

    useEffect(() => {
        return window.electron?.security?.onPermissionRequest(prompt => setQueue(q => [...q, prompt]));
    }, []);

    const current = queue[0];

    const respond = (allow: boolean) => {
        if (!current) return;
        window.electron.security.sendPermissionResponse(current.id, allow);
        setQueue(q => q.slice(1));
    };

    // Deliberately no Escape shortcut: a decision that gets remembered should
    // never be made by a keypress meant for something else.

    const Icon = current ? KIND_INFO[current.kinds[0]]?.icon ?? Shield : Shield;
    const requester = current?.isApp ? 'Underlay' : hostOf(current?.origin ?? '');

    return (
        <AnimatePresence>
            {current && (
                <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                    className="popover fixed top-[92px] left-1/2 -translate-x-1/2 z-[120] w-[340px] p-5 text-underlay-text"
                    role="alertdialog"
                    aria-labelledby="permission-title"
                >
                    <div className="flex items-start gap-3.5">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-underlay-accent/15 text-underlay-accent flex items-center justify-center">
                            <Icon size={20} strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                            <h2 id="permission-title" className="text-[13px] font-semibold leading-snug">
                                Allow “{requester}” to {describe(current.kinds)}?
                            </h2>
                            {current.externalUrl ? (
                                <p className="mt-1 text-[12px] text-underlay-text/55 break-all">
                                    {current.externalUrl.split(':')[0]}: link
                                </p>
                            ) : (
                                <p className="mt-1 text-[12px] text-underlay-text/55 leading-snug">
                                    {current.isApp
                                        ? 'Used to show local weather on the start page. Nothing leaves your device until you allow it.'
                                        : 'You can change this later in Settings › Privacy.'}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button className="btn-secondary flex-1" onClick={() => respond(false)}>Don’t Allow</button>
                        <button className="btn-primary flex-1" onClick={() => respond(true)} autoFocus>Allow</button>
                    </div>
                    {queue.length > 1 && (
                        <p className="mt-2.5 text-center text-[11px] text-underlay-text/40">{queue.length - 1} more {queue.length === 2 ? 'request' : 'requests'}</p>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

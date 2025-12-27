import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, MapPin, Bell, Shield, X, Check } from 'lucide-react';
import { getPlatformElectron } from '../utils/PlatformUtils';

interface PermissionRequestProps {
    // Pass any necessary props or callbacks if needed, 
    // but this component will primarily listen to IPC events.
}

interface PermissionEvent {
    id: number;
    origin: string;
    permission: string; // 'media', 'geolocation', 'notifications', 'midi', etc.
    details: any;
}

export const PermissionOverlay: React.FC<PermissionRequestProps> = () => {
    const [request, setRequest] = useState<PermissionEvent | null>(null);

    useEffect(() => {
        const electron = getPlatformElectron();
        const cleanup = electron?.security?.onPermissionRequest?.((data: any) => {
            // "media" usually comes with details.mediaTypes = ['video', 'audio']
            setRequest({ ...data, id: Date.now() });
        });
        return cleanup;
    }, []);

    const handleResponse = (allow: boolean) => {
        const electron = getPlatformElectron();
        if (request) {
            electron?.security?.sendPermissionResponse?.(request.id, allow);
        }
        setRequest(null);
    };

    if (!request) return null;

    // Determine Icon & Label
    let Icon = Shield;
    let label = 'Hardware Access';

    if (request.permission === 'media') {
        const types = request.details?.mediaTypes || [];
        if (types.includes('video') && types.includes('audio')) {
            Icon = Camera; // Simpler to just show camera or a combined icon
            label = 'Camera & Microphone';
        } else if (types.includes('video')) {
            Icon = Camera;
            label = 'Camera';
        } else if (types.includes('audio')) {
            Icon = Mic;
            label = 'Microphone';
        }
    } else if (request.permission === 'geolocation') {
        Icon = MapPin;
        label = 'Location';
    } else if (request.permission === 'notifications') {
        Icon = Bell;
        label = 'Notifications';
    }

    const domain = new URL(request.origin).hostname;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-[#1a1a1d] border border-white/10 shadow-2xl rounded-xl p-4 flex flex-col items-center gap-3 min-w-[320px]"
            >
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-1">
                    <Icon size={20} />
                </div>

                <div className="text-center">
                    <h3 className="text-white font-medium text-sm">Permission Request</h3>
                    <p className="text-white/60 text-xs mt-1">
                        <span className="font-bold text-white/90">{domain}</span> wants to access your <span className="text-blue-400">{label}</span>.
                    </p>
                </div>

                <div className="flex gap-2 w-full mt-2">
                    <button
                        onClick={() => handleResponse(false)}
                        className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                        <X size={14} />
                        Deny
                    </button>
                    <button
                        onClick={() => handleResponse(true)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20"
                    >
                        <Check size={14} />
                        Allow
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

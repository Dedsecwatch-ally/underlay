import React from 'react';
import { motion } from 'framer-motion';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export function LoadingScreen() {
    const isOnline = useOnlineStatus();

    return (
        <div className="absolute inset-0 bg-[#0f0f11] flex flex-col items-center justify-center z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="relative flex items-center justify-center"
            >
                {/* Outer Glow */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className={`absolute w-32 h-32 rounded-full blur-3xl ${isOnline ? 'bg-underlay-accent/20' : 'bg-red-500/20'}`}
                />

                {/* Inner Pulse */}
                <motion.div
                    animate={{
                        scale: [1, 1.05, 1],
                        opacity: [0.8, 1, 0.8],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${isOnline ? 'border-underlay-accent/50' : 'border-red-500/50'}`}
                >
                    {isOnline ? (
                        <motion.div
                            animate={{ scale: [1, 0.8, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="w-3 h-3 bg-underlay-accent rounded-full"
                        />
                    ) : (
                        <WifiOff size={20} className="text-red-500" />
                    )}
                </motion.div>

                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className={`absolute top-20 text-xs font-mono tracking-widest uppercase ${isOnline ? 'text-underlay-text/20' : 'text-red-500/50'}`}
                >
                    {isOnline ? 'Loading' : 'Offline'}
                </motion.span>
            </motion.div>
        </div>
    );
}

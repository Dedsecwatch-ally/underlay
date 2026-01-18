
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, CheckCircle2, File } from 'lucide-react';
import { DownloadItem } from '../context/BrowserContext';

export function DownloadToast({ latestDownload }: { latestDownload: DownloadItem | null }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (latestDownload) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 4000); // Hide after 4s
            return () => clearTimeout(timer);
        }
    }, [latestDownload]);

    if (!latestDownload) return null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: 50, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 20, opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="absolute bottom-6 right-6 z-50 bg-[#1e1e20] border border-white/10 rounded-xl shadow-2xl p-4 flex items-center gap-4 max-w-sm"
                >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                        {latestDownload.state === 'completed' ? <CheckCircle2 size={20} /> : <Download size={20} />}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">{latestDownload.filename}</h4>
                        <p className="text-xs text-white/50">
                            {latestDownload.state === 'completed' ? 'Download completed' : 'Downloading...'}
                        </p>
                    </div>

                    {latestDownload.state === 'completed' && (
                        <div className="w-12 h-12 relative flex items-center justify-center">
                            {/* Optional: Small preview image or file icon */}
                            <File size={24} className="text-white/20" />
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

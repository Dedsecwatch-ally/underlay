import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download as DownloadIcon, X, File, CheckCircle2, AlertCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { useBrowser, DownloadItem } from '../context/BrowserContext';
import { formatBytes } from '../hooks/usePrivacyStats';

const overlayVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
};

export function DownloadsOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { state, dispatch } = useBrowser();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-12 bg-black/60 backdrop-blur-sm" onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}>
                    <motion.div
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="w-full max-w-2xl bg-[#1e1e20] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                            <h2 className="text-lg font-medium text-white flex items-center gap-2">
                                <DownloadIcon size={20} className="text-blue-400" />
                                Downloads
                            </h2>
                            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {state.downloads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-white/20">
                                    <DownloadIcon size={48} className="mb-4 opacity-50" />
                                    <p>No downloads yet</p>
                                    <button
                                        className="mt-4 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm rounded-lg transition-colors border border-blue-500/20"
                                        onClick={() => {
                                            // Trigger Mock Download
                                            const id = Math.random().toString(36).substr(2, 9);
                                            dispatch({
                                                type: 'UPDATE_DOWNLOAD',
                                                payload: {
                                                    id,
                                                    filename: `example - file - ${Math.floor(Math.random() * 100)}.zip`,
                                                    url: 'https://example.com/file.zip',
                                                    state: 'progressing',
                                                    receivedBytes: 0,
                                                    totalBytes: 1024 * 1024 * 50 // 50MB
                                                }
                                            });

                                            // Simulate Progress
                                            let progress = 0;
                                            const total = 1024 * 1024 * 50;
                                            const interval = setInterval(() => {
                                                progress += total / 100;
                                                if (progress >= total) {
                                                    progress = total;
                                                    dispatch({ type: 'UPDATE_DOWNLOAD', payload: { id, state: 'completed', receivedBytes: total } });
                                                    clearInterval(interval);
                                                } else {
                                                    dispatch({ type: 'UPDATE_DOWNLOAD', payload: { id, receivedBytes: progress } });
                                                }
                                            }, 100);
                                        }}
                                    >
                                        Simulate Demo Download
                                    </button>
                                </div>
                            ) : (
                                state.downloads.slice().reverse().map(item => (
                                    <DownloadItemRow key={item.id} item={item} />
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function DownloadItemRow({ item }: { item: DownloadItem }) {
    const progress = item.totalBytes > 0 ? (item.receivedBytes / item.totalBytes) * 100 : 0;

    return (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
            {/* Icon */}
            <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center text-white/40">
                <File size={24} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-white truncate pr-4">{item.filename}</h3>
                    <span className="text-xs text-white/40 whitespace-nowrap">
                        {item.state === 'completed' ? formatBytes(item.totalBytes) : `${formatBytes(item.receivedBytes)} / ${formatBytes(item.totalBytes)}`}
                    </span >
                </div >

                {/* Progress Bar or Status */}
                {
                    item.state === 'progressing' ? (
                        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-blue-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.2 }}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs">
                            {item.state === 'completed' && <><CheckCircle2 size={12} className="text-green-400" /><span className="text-green-400">Completed</span></>}
                            {item.state === 'cancelled' && <><X size={12} className="text-red-400" /><span className="text-red-400">Cancelled</span></>}
                            {item.state === 'interrupted' && <><AlertCircle size={12} className="text-yellow-400" /><span className="text-yellow-400">Interrupted</span></>}
                        </div>
                    )
                }

                {
                    item.state === 'progressing' && (
                        <div className="mt-1 text-[10px] text-white/30 truncate">{item.url}</div>
                    )
                }
            </div >

            {/* Actions */}
            < div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" >
                {
                    item.state === 'progressing' && (
                        <button className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white" title="Pause">
                            <PauseCircle size={20} />
                        </button>
                    )
                }
                {
                    item.state === 'completed' && (
                        <button className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white" title="Show in Folder">
                            <DownloadIcon size={20} />
                        </button>
                    )
                }
            </div >
        </div >
    );
}

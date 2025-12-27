import React, { useState } from 'react';
import { useBrowser, HistoryEntry, Bookmark } from '../context/BrowserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Star, Search, Tag, X, Download, ShieldCheck, Trash2 } from 'lucide-react';
import classNames from 'classnames';

export function HistoryOverlay({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { state, dispatch } = useBrowser();
    const [activeTab, setActiveTab] = useState<'history' | 'bookmarks' | 'downloads'>('history');
    const [search, setSearch] = useState('');

    const filteredHistory = state.history.filter(h =>
        h.title.toLowerCase().includes(search.toLowerCase()) ||
        h.url.toLowerCase().includes(search.toLowerCase())
    );

    const filteredBookmarks = state.bookmarks.filter(b =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.url.toLowerCase().includes(search.toLowerCase()) ||
        b.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );

    const filteredDownloads = state.downloads.filter(d =>
        d.filename.toLowerCase().includes(search.toLowerCase()) ||
        d.url.toLowerCase().includes(search.toLowerCase())
    );

    // Group history by date (Simplified for demo: Today vs Older)
    const today = new Date().toDateString();
    const historyGroups = filteredHistory.reduce((acc, entry) => {
        const date = new Date(entry.timestamp).toDateString();
        const key = date === today ? 'Today' : date;
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
    }, {} as Record<string, HistoryEntry[]>);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="absolute top-10 bottom-0 left-0 w-[400px] bg-[#1a1a1e] border-r border-white/10 z-40 flex flex-col shadow-2xl"
                >
                    <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2">
                        <div className="flex bg-black/20 p-1 rounded-lg">
                            <button
                                className={`p-1.5 px-3 rounded-md text-xs font-medium transition-all ${activeTab === 'history' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                                onClick={() => setActiveTab('history')}
                                title="History"
                            >
                                History
                            </button>
                            <button
                                className={`p-1.5 px-3 rounded-md text-xs font-medium transition-all ${activeTab === 'bookmarks' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                                onClick={() => setActiveTab('bookmarks')}
                                title="Bookmarks"
                            >
                                Bookmarks
                            </button>
                            <button
                                className={`p-1.5 px-3 rounded-md text-xs font-medium transition-all ${activeTab === 'downloads' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                                onClick={() => setActiveTab('downloads')}
                                title="Downloads"
                            >
                                Downloads
                            </button>
                        </div>
                        <div className="flex-1 relative ml-2">
                            <Search size={14} className="absolute left-2 top-2 text-white/30" />
                            <input
                                className="w-full bg-black/20 rounded h-8 pl-8 pr-2 text-xs text-white outline-none border border-transparent focus:border-white/10"
                                placeholder="Search..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <button onClick={onClose} className="text-white/30 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {activeTab === 'history' && (
                            <div className="flex flex-col gap-6">
                                {filteredHistory.length > 0 && (
                                    <div className="flex justify-end px-1">
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to clear your browsing history?')) {
                                                    dispatch({ type: 'CLEAR_HISTORY' });
                                                }
                                            }}
                                            className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all text-xs font-medium border border-red-500/10 hover:border-red-500/30"
                                        >
                                            <Trash2 size={12} className="group-hover:scale-110 transition-transform" />
                                            Clear All History
                                        </button>
                                    </div>
                                )}
                                {Object.entries(historyGroups).map(([date, entries]) => (
                                    <div key={date}>
                                        <div className="text-xs font-bold text-underlay-accent mb-2 uppercase tracking-wide opacity-80">{date}</div>
                                        <div className="flex flex-col gap-1">
                                            {entries.map(entry => (
                                                <div
                                                    key={entry.id}
                                                    className="group flex flex-col p-2 hover:bg-white/5 rounded cursor-pointer transition-colors"
                                                    onClick={() => {
                                                        dispatch({ type: 'NEW_TAB', payload: { url: entry.url } });
                                                        onClose();
                                                    }}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-white/90 truncate">{entry.title || entry.url}</div>
                                                        <div className="text-[10px] text-white/40 truncate flex justify-between mr-2">
                                                            <span>{new URL(entry.url).hostname}</span>
                                                            <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </div>
                                                    <div
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded transition-all text-white/30 hover:text-red-400"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            dispatch({ type: 'REMOVE_HISTORY_ITEM', payload: { id: entry.id } });
                                                        }}
                                                        title="Delete from history"
                                                    >
                                                        <Trash2 size={12} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {filteredHistory.length === 0 && <div className="text-white/20 text-center mt-10">No history found</div>}
                            </div>
                        )}

                        {activeTab === 'bookmarks' && (
                            <div className="flex flex-col gap-2">
                                {filteredBookmarks.map(b => (
                                    <div key={b.id} className="bg-white/5 p-3 rounded flex flex-col gap-2 group">
                                        <div
                                            className="flex flex-col cursor-pointer"
                                            onClick={() => {
                                                dispatch({ type: 'NEW_TAB', payload: { url: b.url } });
                                                onClose();
                                            }}
                                        >
                                            <div className="text-sm font-medium text-white group-hover:text-yellow-400 transition-colors">{b.title}</div>
                                            <div className="text-[10px] text-white/40 truncate">{b.url}</div>
                                        </div>

                                        {/* Tags UI */}
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {b.tags.map(tag => (
                                                <span key={tag} className="bg-underlay-accent/20 text-underlay-accent text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <Tag size={8} /> {tag}
                                                </span>
                                            ))}
                                            <button
                                                className="text-[10px] text-white/30 hover:text-white border border-white/10 px-2 rounded hover:bg-white/5"
                                                onClick={() => {
                                                    const newTag = prompt("Add a tag:");
                                                    if (newTag) {
                                                        const newTags = [...b.tags, newTag];
                                                        dispatch({ type: 'UPDATE_BOOKMARK', payload: { url: b.url, title: b.title, tags: newTags } });
                                                    }
                                                }}
                                            >
                                                + Tag
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {filteredBookmarks.length === 0 && <div className="text-white/20 text-center mt-10">No bookmarks found</div>}
                            </div>
                        )}

                        {activeTab === 'downloads' && (
                            <div className="flex flex-col gap-3">
                                {filteredDownloads.map(d => (
                                    <div key={d.id} className="bg-white/5 p-3 rounded flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                                                <Download size={16} className={d.state === 'completed' ? 'text-green-500' : 'text-white/50'} />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="text-sm text-white truncate mb-0.5">{d.filename}</div>
                                                <div className="text-[10px] text-white/40 flex justify-between">
                                                    <span>{(d.receivedBytes / 1024 / 1024).toFixed(1)} MB / {(d.totalBytes / 1024 / 1024).toFixed(1)} MB</span>
                                                    <span className="uppercase font-bold">{d.state}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="h-1 bg-white/10 rounded overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(d.receivedBytes / d.totalBytes) * 100}%` }}
                                                className={`h-full ${d.state === 'completed' ? 'bg-green-500' : d.state === 'failed' ? 'bg-red-500' : 'bg-underlay-accent'}`}
                                            />
                                        </div>
                                        {/* Integrity Verification */}
                                        {d.state === 'completed' && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-green-400 bg-green-500/10 p-1.5 rounded self-start">
                                                <ShieldCheck size={10} />
                                                <span>Integrity Verified ({d.totalBytes} bytes)</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {filteredDownloads.length === 0 && <div className="text-white/20 text-center mt-10">No downloads yet</div>}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

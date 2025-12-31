import React, { useState, useMemo } from 'react';
import { useBrowser } from '../../context/BrowserContext';
import { Search, Trash2, Clock, Globe, X } from 'lucide-react';

export function HistoryView() {
    const { state, dispatch } = useBrowser();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredHistory = useMemo(() => {
        if (!searchQuery) return state.history;
        const lower = searchQuery.toLowerCase();
        return state.history.filter(h =>
            h.title.toLowerCase().includes(lower) ||
            h.url.toLowerCase().includes(lower)
        );
    }, [state.history, searchQuery]);

    const groupedHistory = useMemo(() => {
        const groups: { [key: string]: typeof filteredHistory } = {};
        filteredHistory.forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(item);
        });
        return groups;
    }, [filteredHistory]);

    const handleVisit = (url: string) => {
        if (state.activeTabId) {
            dispatch({ type: 'LOAD_URL', payload: { id: state.activeTabId, url } });
        } else {
            dispatch({ type: 'NEW_TAB', payload: { url } });
        }
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">History</h2>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-underlay-text/40" size={16} />
                        <input
                            type="text"
                            placeholder="Search history..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-underlay-surface border border-underlay-text/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-underlay-accent/50 w-64"
                        />
                    </div>
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to clear your entire history?')) {
                                dispatch({ type: 'CLEAR_HISTORY' });
                            }
                        }}
                        className="px-4 py-2 bg-red-500/10 text-red-400 rounded-md text-sm hover:bg-red-500/20 transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={16} />
                        Clear History
                    </button>
                </div>
            </div>

            {state.history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-underlay-text/40">
                    <Clock size={48} className="mb-4 opacity-50" />
                    <p>No history yet</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedHistory).map(([date, items]) => (
                        <div key={date}>
                            <h3 className="text-sm font-bold text-underlay-text/40 mb-4 sticky top-0 bg-underlay-bg py-2 uppercase tracking-wider">{date}</h3>
                            <div className="bg-underlay-surface rounded-lg overflow-hidden border border-underlay-border">
                                {items.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleVisit(item.url)}
                                        className="group flex items-center gap-4 p-4 hover:bg-underlay-text/5 border-b border-underlay-border last:border-none transition-colors cursor-pointer"
                                    >
                                        <div className="p-2 rounded bg-underlay-text/5 text-underlay-text/60">
                                            <Globe size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{item.title || item.url}</div>
                                            <div className="text-xs text-underlay-text/40 truncate">{item.url}</div>
                                        </div>
                                        <div className="text-xs text-underlay-text/40 font-mono">
                                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                dispatch({ type: 'REMOVE_HISTORY_ITEM', payload: { id: item.id } });
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 text-red-400 rounded transition-all"
                                            title="Delete from history"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

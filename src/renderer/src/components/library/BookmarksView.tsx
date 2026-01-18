import React from 'react';
import { useBrowser } from '../../context/BrowserContext';
import { Book, Star, Trash2, ExternalLink } from 'lucide-react';

export function BookmarksView() {
    const { state, dispatch } = useBrowser();

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Bookmarks</h2>
            </div>

            {state.bookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-underlay-text/40">
                    <Star size={48} className="mb-4 opacity-50" />
                    <p>No bookmarks yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {state.bookmarks.map(bookmark => (
                        <div key={bookmark.id} className="group bg-underlay-surface p-4 rounded-lg border border-underlay-border hover:border-underlay-accent/30 transition-all hover:translate-y-[-2px] hover:shadow-lg">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-md">
                                    <Book size={20} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => dispatch({ type: 'LOAD_URL', payload: { id: state.activeTabId, url: bookmark.url } })}
                                        className="p-1.5 hover:bg-underlay-text/10 rounded text-underlay-text/60"
                                        title="Open in current tab"
                                    >
                                        <ExternalLink size={14} />
                                    </button>
                                    <button
                                        onClick={() => dispatch({ type: 'TOGGLE_BOOKMARK', payload: { url: bookmark.url, title: bookmark.title } })}
                                        className="p-1.5 hover:bg-red-500/10 text-red-400 rounded"
                                        title="Remove bookmark"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold truncate mb-1" title={bookmark.title}>{bookmark.title}</h3>
                            <p className="text-xs text-underlay-text/40 truncate">{bookmark.url}</p>

                            <div className="mt-4 text-xs text-underlay-text/30">
                                Added {new Date(bookmark.timestamp).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

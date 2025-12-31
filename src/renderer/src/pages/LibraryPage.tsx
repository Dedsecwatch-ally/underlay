import React, { useState, useEffect } from 'react';
import { useBrowser } from '../context/BrowserContext';
import { History, Book, Download, Search, Trash2, X, Folder, File } from 'lucide-react';
import { HistoryView } from '../components/library/HistoryView';
import { BookmarksView } from '../components/library/BookmarksView';
import { DownloadsView } from '../components/library/DownloadsView';
import { motion } from 'framer-motion';

type ViewType = 'history' | 'bookmarks' | 'downloads';

export function LibraryPage({ initialView = 'history' }: { initialView?: ViewType }) {
    const [activeView, setActiveView] = useState<ViewType>(initialView);
    const { state, dispatch } = useBrowser();

    // Sync URL query param if needed (optional implementation detail)

    const SidebarItem = ({ id, label, icon: Icon }: { id: ViewType, label: string, icon: any }) => (
        <button
            onClick={() => setActiveView(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${activeView === id
                ? 'bg-underlay-accent/10 text-underlay-accent'
                : 'text-underlay-text/60 hover:bg-underlay-text/5'
                }`}
        >
            <Icon size={18} />
            <span className="font-medium">{label}</span>
        </button>
    );

    return (
        <div className="w-full h-full bg-underlay-bg text-underlay-text flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r border-underlay-border bg-underlay-surface pt-8 px-4 flex flex-col gap-2">
                <h1 className="text-xl font-bold px-4 mb-6 text-underlay-text/80">Library</h1>

                <SidebarItem id="history" label="History" icon={History} />
                <SidebarItem id="bookmarks" label="Bookmarks" icon={Book} />
                <SidebarItem id="downloads" label="Downloads" icon={Download} />
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-underlay-bg">
                <div className="flex-1 overflow-auto p-8">
                    {activeView === 'history' && <HistoryView />}
                    {activeView === 'bookmarks' && <BookmarksView />}
                    {activeView === 'downloads' && <DownloadsView />}
                </div>
            </div>
        </div>
    );
}

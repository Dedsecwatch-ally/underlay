import React from 'react';
import { useBrowser } from '../../context/BrowserContext';
import { Download, File, CheckCircle2, AlertCircle, FolderOpen } from 'lucide-react';

export function DownloadsView() {
    const { state } = useBrowser();

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Downloads</h2>
                <button
                    onClick={() => window.electron.shell.openExternal('underlay://downloads-folder')} // Hypothetical, or open default folder
                    className="text-xs text-underlay-accent hover:underline flex items-center gap-1"
                >
                    <FolderOpen size={14} />
                    Open Downloads Folder
                </button>
            </div>

            {state.downloads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-underlay-text/40">
                    <Download size={48} className="mb-4 opacity-50" />
                    <p>No downloads yet</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {state.downloads.map(item => (
                        <div key={item.id} className="bg-underlay-surface p-4 rounded-lg border border-underlay-border flex items-center gap-4">
                            <div className="p-3 bg-underlay-text/5 rounded-md text-underlay-text/60">
                                <File size={24} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{item.filename}</div>
                                <div className="text-xs text-underlay-text/40 truncate">{item.url}</div>
                                {item.state === 'progressing' && (
                                    <div className="w-full h-1 bg-underlay-bg rounded-full mt-2 overflow-hidden">
                                        <div
                                            className="h-full bg-underlay-accent transition-all duration-300"
                                            style={{ width: `${(item.receivedBytes / item.totalBytes) * 100}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="text-right min-w-[120px]">
                                {item.state === 'completed' && (
                                    <div className="flex items-center justify-end gap-2 text-green-400 text-sm font-medium">
                                        <CheckCircle2 size={16} />
                                        <span>Completed</span>
                                    </div>
                                )}
                                {item.state === 'progressing' && (
                                    <div className="text-underlay-accent text-sm font-medium">
                                        {Math.round((item.receivedBytes / item.totalBytes) * 100)}%
                                    </div>
                                )}
                                {(item.state === 'interrupted' || item.state === 'failed') && (
                                    <div className="flex items-center justify-end gap-2 text-red-400 text-sm font-medium">
                                        <AlertCircle size={16} />
                                        <span>Failed</span>
                                    </div>
                                )}
                                <div className="text-xs text-underlay-text/40 mt-1">
                                    {(item.totalBytes / 1024 / 1024).toFixed(1)} MB
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    if (item.path) window.electron.shell.showItem(item.path);
                                }}
                                className="p-2 hover:bg-underlay-text/10 rounded-full text-underlay-text/60"
                                title="Show in Finder"
                                disabled={!item.path}
                            >
                                <FolderOpen size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

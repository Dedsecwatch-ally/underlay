import React, { useState, useEffect } from 'react';
import { PenLine, Save, Trash2 } from 'lucide-react';

export function QuickNotesWidget() {
    const [note, setNote] = useState('');
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('quick-note');
        if (saved) setNote(saved);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNote(val);
        localStorage.setItem('quick-note', val);
    };

    return (
        <div className={`absolute bottom-6 right-6 z-20 transition-all duration-300 ${expanded ? 'w-80 h-96' : 'w-12 h-12'}`}>
            {expanded ? (
                <div className="w-full h-full bg-[#1a1a1e]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="h-10 flex items-center justify-between px-4 border-b border-white/5 bg-white/5">
                        <span className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
                            <PenLine size={12} /> Notes
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setNote(''); localStorage.removeItem('quick-note'); }}
                                className="text-white/30 hover:text-red-400 transition-colors"
                                title="Clear"
                            >
                                <Trash2 size={12} />
                            </button>
                            <button
                                onClick={() => setExpanded(false)}
                                className="text-white/30 hover:text-white transition-colors"
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>
                    <textarea
                        className="flex-1 bg-transparent p-4 text-sm text-white/90 placeholder-white/20 resize-none outline-none font-mono leading-relaxed custom-scrollbar"
                        placeholder="Type your thoughts here..."
                        value={note}
                        onChange={handleChange}
                        autoFocus
                    />
                    <div className="h-6 bg-white/5 text-[10px] text-white/20 flex items-center justify-end px-3">
                        {note.length} chars
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setExpanded(true)}
                    className="w-full h-full bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 hover:scale-105 transition-all group shadow-lg"
                    title="Quick Notes"
                >
                    <PenLine size={20} className="text-white/50 group-hover:text-yellow-400 transition-colors" strokeWidth={1.5} />
                    {note.length > 0 && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-yellow-500 rounded-full border-2 border-black"></span>
                    )}
                </button>
            )}
        </div>
    );
}

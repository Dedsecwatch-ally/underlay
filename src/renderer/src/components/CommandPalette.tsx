import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ArrowRight, CornerDownLeft, X, Layers, Activity, Clock, Settings } from 'lucide-react';
import { useBrowser } from '../context/BrowserContext';

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { state, dispatch } = useBrowser();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const commands = [
        { id: 'new-tab', label: 'New Tab', icon: <Layers size={14} />, action: () => dispatch({ type: 'NEW_TAB' }), shortcut: '⌘T' },
        { id: 'close-tab', label: 'Close Active Tab', icon: <X size={14} />, action: () => state.activeTabId && dispatch({ type: 'CLOSE_TAB', payload: { id: state.activeTabId } }), shortcut: '⌘W' },
        { id: 'reload', label: 'Reload Page', icon: <ArrowRight size={14} />, action: () => dispatch({ type: 'TRIGGER_COMMAND', payload: 'reload' }), shortcut: '⌘R' },
        { id: 'focus-url', label: 'Focus Address Bar', icon: <Search size={14} />, action: () => dispatch({ type: 'TRIGGER_COMMAND', payload: 'focusAddressBar' }), shortcut: '⌘L' },
        { id: 'history', label: 'Toggle History', icon: <Clock size={14} />, action: () => dispatch({ type: 'TRIGGER_COMMAND', payload: 'toggleHistory' }), shortcut: '⌘H' },
        { id: 'settings', label: 'Toggle Settings', icon: <Settings size={14} />, action: () => dispatch({ type: 'TRIGGER_COMMAND', payload: 'toggleSettings' }), shortcut: '⌘,' },
        { id: 'underlay', label: 'Toggle Underlay/DevTools', icon: <Activity size={14} />, action: () => dispatch({ type: 'TRIGGER_COMMAND', payload: 'toggleDevTools' }), shortcut: '⌥⌘I' },
    ];

    const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % filtered.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const cmd = filtered[selectedIndex];
            if (cmd) {
                cmd.action();
                onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80"
                        onClick={onClose} // Keep onClick on the overlay
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: -20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: -20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 350 }}
                        className="w-[500px] max-w-[90vw] bg-[#1a1a1e] border border-white/10 rounded-xl shadow-2xl relative overflow-hidden flex flex-col"
                    >
                        <div className="flex items-center gap-3 p-4 border-b border-white/5">
                            <Command size={18} className="text-white/30" />
                            <input
                                ref={inputRef}
                                className="bg-transparent border-none outline-none flex-1 text-lg text-white placeholder-white/20 font-light"
                                placeholder="Type a command..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <div className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/40 font-mono">ESC</div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto p-2">
                            {filtered.length === 0 && (
                                <div className="p-4 text-center text-white/30 text-sm">No commands found</div>
                            )}
                            {filtered.map((cmd, i) => (
                                <button
                                    key={cmd.id}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm transition-colors ${i === selectedIndex ? 'bg-blue-600/20 text-blue-200' : 'text-white/60 hover:bg-white/5'}`}
                                    onClick={() => { cmd.action(); onClose(); }}
                                    onMouseEnter={() => setSelectedIndex(i)}
                                >
                                    <div className={i === selectedIndex ? 'text-blue-400' : 'text-white/40'}>{cmd.icon}</div>
                                    <span className="flex-1 text-left">{cmd.label}</span>
                                    {cmd.shortcut && (
                                        <span className="text-[10px] font-mono opacity-50 bg-white/5 px-1.5 py-0.5 rounded">
                                            {cmd.shortcut}
                                        </span>
                                    )}
                                    {i === selectedIndex && <CornerDownLeft size={12} className="opacity-50" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div >
            )
            }
        </AnimatePresence >
    );
}

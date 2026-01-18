import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { X, Type, Minus, Plus, AlignLeft, AlignCenter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReaderData {
    title: string;
    byline: string;
    content: string; // HTML string
    siteName: string;
}

interface ReaderViewProps {
    data: ReaderData | null;
    isVisible: boolean;
    onClose: () => void;
}

export function ReaderView({ data, isVisible, onClose }: ReaderViewProps) {
    const [fontSize, setFontSize] = useState(18);
    const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif'>('serif');

    // safe scroll lock on body when open could be good, but we are an overlay

    if (!isVisible || !data) return null;

    const themeColors = {
        light: 'bg-[#fbfbfb] text-[#333333]',
        sepia: 'bg-[#f4ecd8] text-[#5b4636]',
        dark: 'bg-[#1a1a1a] text-[#c8c8c8]'
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className={`absolute inset-0 z-50 overflow-y-auto ${themeColors[theme]} transition-colors duration-300`}
                >
                    <div className="max-w-3xl mx-auto px-8 py-12 min-h-screen relative">
                        {/* Toolbar */}
                        <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-inherit to-transparent pointer-events-none sticky-toolbar z-10">
                            <div className="pointer-events-auto flex items-center gap-2 bg-black/5 dark:bg-white/10 backdrop-blur-md p-2 rounded-full shadow-sm opacity-0 hover:opacity-100 transition-opacity duration-300 group-hover:opacity-100">
                                <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                                <div className="h-4 w-px bg-current opacity-20 mx-1" />
                                <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full">
                                    <Minus size={16} />
                                </button>
                                <span className="text-xs font-mono w-6 text-center">{fontSize}</span>
                                <button onClick={() => setFontSize(Math.min(32, fontSize + 2))} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full">
                                    <Plus size={16} />
                                </button>
                                <div className="h-4 w-px bg-current opacity-20 mx-1" />
                                <button onClick={() => setTheme('light')} className={`w-6 h-6 rounded-full border border-black/10 bg-[#fbfbfb] ${theme === 'light' ? 'ring-2 ring-blue-500' : ''}`} />
                                <button onClick={() => setTheme('sepia')} className={`w-6 h-6 rounded-full border border-black/10 bg-[#f4ecd8] ${theme === 'sepia' ? 'ring-2 ring-blue-500' : ''}`} />
                                <button onClick={() => setTheme('dark')} className={`w-6 h-6 rounded-full border border-white/10 bg-[#1a1a1a] ${theme === 'dark' ? 'ring-2 ring-blue-500' : ''}`} />
                                <div className="h-4 w-px bg-current opacity-20 mx-1" />
                                <button onClick={() => setFontFamily('sans')} className={`p-2 rounded font-sans text-xs ${fontFamily === 'sans' ? 'bg-black/10 dark:bg-white/10' : ''}`}>Aa</button>
                                <button onClick={() => setFontFamily('serif')} className={`p-2 rounded font-serif text-xs ${fontFamily === 'serif' ? 'bg-black/10 dark:bg-white/10' : ''}`}>Aa</button>
                            </div>
                        </div>

                        {/* Content */}
                        <article className={`prose prose-lg max-w-none ${fontFamily === 'sans' ? 'font-sans' : 'font-serif'} ${theme === 'dark' ? 'prose-invert' : ''}`} style={{ fontSize: `${fontSize}px` }}>
                            <h1 className="mb-4 leading-tight">{data.title}</h1>
                            {data.byline && <div className="text-lg opacity-60 mb-8 font-medium">{data.byline}</div>}
                            <div
                                className="reader-content leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content) }}
                            />
                        </article>

                        <div className="mt-20 text-center opacity-40 text-sm">
                            Readability View • {data.siteName}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, ArrowLeft, ArrowRight, RotateCw, ExternalLink, Image, Search } from 'lucide-react';
import { getPlatformElectron } from '../utils/PlatformUtils';

// NOTE: In a real Electron webview scenario, getting the context menu event *from* the webview 
// usually requires an IPC message from the preload script of that webview, containing coordinate/selection data.
// 
// For this implementation, we'll assume the main process sends a 'context-menu' IPC event with 
// the params needed (x, y, selectionText, mediaType, srcUrl).

interface ContextMenuData {
    x: number;
    y: number;
    selectionText?: string;
    mediaType?: string; // 'image', 'video', 'canvas', 'none'
    srcUrl?: string;
    linkUrl?: string;
}

export const ContextMenu: React.FC = () => {
    const [menuData, setMenuData] = useState<ContextMenuData | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const electron = getPlatformElectron();

        const cleanup = electron?.ui?.onContextMenu?.((data: any) => {
            let { x, y } = data;
            if (x + 200 > window.innerWidth) x = window.innerWidth - 210;
            if (y + 300 > window.innerHeight) y = window.innerHeight - 310;

            setMenuData({ ...data, x, y });
        });

        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuData(null);
            }
        };

        window.addEventListener('click', handleClick);
        window.addEventListener('blur', () => setMenuData(null));

        return () => {
            window.removeEventListener('click', handleClick);
            cleanup?.();
        };
    }, []);

    if (!menuData) return null;

    const { x, y, selectionText, mediaType, srcUrl, linkUrl } = menuData;
    const hasSelection = !!selectionText;
    const isImage = mediaType === 'image' && srcUrl;
    const isLink = !!linkUrl;

    return (
        <AnimatePresence>
            <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="fixed z-[9999] w-48 bg-[#1e1e21] border border-white/10 rounded-lg shadow-2xl py-1.5 flex flex-col text-sm backdrop-blur-xl"
                style={{ top: y, left: x }}
                onContextMenu={(e) => e.preventDefault()} // Prevent native menu on our menu
            >
                {/* Navigation (Always available if not specific element focused? Or maybe separate?) 
                    Keeping it simple essentially duplicating browser controls 
                */}
                <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-white/5">
                    <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white" title="Back">
                        <ArrowLeft size={16} />
                    </button>
                    <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white" title="Forward">
                        <ArrowRight size={16} />
                    </button>
                    <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white" title="Reload">
                        <RotateCw size={16} />
                    </button>
                </div>

                {hasSelection && (
                    <>
                        <MenuItem icon={<Copy size={14} />} label="Copy" onClick={() => { navigator.clipboard.writeText(selectionText); setMenuData(null); }} />
                        <MenuItem icon={<Search size={14} />} label="Search Google" onClick={() => { /* Emit search event */ setMenuData(null); }} />
                        <div className="h-px bg-white/5 my-1" />
                    </>
                )}

                {isLink && (
                    <>
                        <MenuItem icon={<ExternalLink size={14} />} label="Open Link in New Tab" onClick={() => { /* Emit new tab */ setMenuData(null); }} />
                        <MenuItem icon={<Copy size={14} />} label="Copy Link Address" onClick={() => { navigator.clipboard.writeText(linkUrl || ''); setMenuData(null); }} />
                        <div className="h-px bg-white/5 my-1" />
                    </>
                )}

                {isImage && (
                    <>
                        <MenuItem icon={<Image size={14} />} label="Open Image in New Tab" onClick={() => { /* Emit new tab */ setMenuData(null); }} />
                        <MenuItem icon={<Copy size={14} />} label="Copy Image Address" onClick={() => { navigator.clipboard.writeText(srcUrl || ''); setMenuData(null); }} />
                        <div className="h-px bg-white/5 my-1" />
                    </>
                )}

                {!hasSelection && !isLink && !isImage && (
                    <>
                        <MenuItem label="Back" onClick={() => { }} />
                        <MenuItem label="Forward" onClick={() => { }} />
                        <MenuItem label="Reload" onClick={() => { }} />
                        <div className="h-px bg-white/5 my-1" />
                        <MenuItem label="Inspect Element" onClick={() => { /* Handle inspect */ }} />
                    </>
                )}

            </motion.div>
        </AnimatePresence>
    );
};

const MenuItem: React.FC<{ icon?: React.ReactNode, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-1.5 text-left text-white/80 hover:bg-blue-600 hover:text-white transition-colors w-full"
    >
        {icon && <span className="text-current opacity-70">{icon}</span>}
        <span>{label}</span>
    </button>
);

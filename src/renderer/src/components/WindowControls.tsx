import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export function WindowControls() {
    // Windows 11 Style Controls
    const handleMinimize = () => {
        // @ts-ignore
        window.electron.window.minimize();
    };

    const handleMaximize = () => {
        // @ts-ignore
        window.electron.window.maximize();
    };

    const handleClose = () => {
        // @ts-ignore
        window.electron.window.close();
    };

    return (
        <div className="flex bg-transparent h-full app-region-no-drag z-50">
            <button
                onClick={handleMinimize}
                className="h-full w-12 flex items-center justify-center hover:bg-white/5 transition-colors group"
                title="Minimize"
            >
                <Minus size={14} className="text-white/50 group-hover:text-white" />
            </button>
            <button
                onClick={handleMaximize}
                className="h-full w-12 flex items-center justify-center hover:bg-white/5 transition-colors group"
                title="Maximize"
            >
                <Square size={12} className="text-white/50 group-hover:text-white" />
            </button>
            <button
                onClick={handleClose}
                className="h-full w-12 flex items-center justify-center hover:bg-[#e81123] transition-colors group"
                title="Close"
            >
                <X size={14} className="text-white/50 group-hover:text-white" />
            </button>
        </div>
    );
}

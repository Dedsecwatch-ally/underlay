import React from 'react';
import { RotateCw } from 'lucide-react';

interface CrashedTabProps {
    onReload: () => void;
    onClose: () => void;
}

export const CrashedTab: React.FC<CrashedTabProps> = ({ onReload, onClose }) => (
    <div className="w-full h-full flex items-center justify-center bg-underlay-bg text-underlay-text p-8">
        <div className="flex flex-col items-center max-w-sm text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-underlay-text/5 flex items-center justify-center mb-5">
                <RotateCw size={24} strokeWidth={1.75} className="text-underlay-text/60" />
            </div>
            <h1 className="text-[17px] font-semibold tracking-tight mb-1.5">This page stopped working</h1>
            <p className="text-[13px] leading-relaxed text-underlay-text/55 mb-6">
                A problem occurred with this webpage, so it was closed to protect the rest of the browser.
            </p>
            <div className="flex gap-2">
                <button onClick={onClose} className="btn-secondary">Close Tab</button>
                <button onClick={onReload} className="btn-primary">Reload Page</button>
            </div>
        </div>
    </div>
);

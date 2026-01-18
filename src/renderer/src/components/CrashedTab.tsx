import React from 'react';
import { RefreshCw, X, AlertTriangle } from 'lucide-react';

interface CrashedTabProps {
    onReload: () => void;
    onClose: () => void;
}

export const CrashedTab: React.FC<CrashedTabProps> = ({ onReload, onClose }) => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f0f11] text-white p-8">
            <div className="bg-[#1a1a1d] p-8 rounded-2xl border border-white/5 flex flex-col items-center max-w-md text-center shadow-2xl">
                <div className="bg-red-500/10 p-4 rounded-full mb-6">
                    <AlertTriangle size={48} className="text-red-500" />
                </div>

                <h1 className="text-2xl font-bold mb-2">Aw, Snap!</h1>
                <p className="text-gray-400 mb-8">
                    Something went wrong while displaying this webpage. To continue, reload or go to another page.
                </p>

                <div className="flex gap-4 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors font-medium border border-white/5"
                    >
                        <X size={18} />
                        Close Tab
                    </button>
                    <button
                        onClick={onReload}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors font-medium shadow-lg shadow-blue-500/20"
                    >
                        <RefreshCw size={18} />
                        Reload
                    </button>
                </div>
            </div>
        </div>
    );
};

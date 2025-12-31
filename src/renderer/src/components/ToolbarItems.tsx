import React from 'react';
import { useBrowser } from '../context/BrowserContext';
import { ArrowLeft, ArrowRight, RotateCcw, X, Clock, Settings, Download as DownloadIcon, User, VenetianMask } from 'lucide-react';
import { motion } from 'framer-motion';

interface ToolbarButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    active?: boolean;
    badge?: number | boolean;
    className?: string;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, icon, title, active, badge, className }) => {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
            whileTap={{ scale: 0.95 }}
            title={title}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors text-white/70 hover:text-white ${active ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : ''} ${className}`}
        >
            {icon}
            {badge && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full border border-[#0f0f11]"></span>
            )}
        </motion.button>
    );
};

export const BackButton = () => {
    const { dispatch } = useBrowser();
    return <ToolbarButton icon={<ArrowLeft size={18} />} title="Go Back" onClick={() => dispatch({ type: 'TRIGGER_COMMAND', payload: 'goBack' })} />;
};

export const ForwardButton = () => {
    const { dispatch } = useBrowser();
    return <ToolbarButton icon={<ArrowRight size={18} />} title="Go Forward" onClick={() => dispatch({ type: 'TRIGGER_COMMAND', payload: 'goForward' })} />;
};

export const ReloadButton = () => {
    const { dispatch, state } = useBrowser();
    const isLoading = state.tabs.find(t => t.id === state.activeTabId)?.status === 'loading';

    return (
        <ToolbarButton
            icon={isLoading ? <X size={18} /> : <RotateCcw size={18} />}
            title={isLoading ? "Stop" : "Reload"}
            onClick={() => dispatch({ type: 'TRIGGER_COMMAND', payload: isLoading ? 'stop' : 'reload' })}
        />
    );
};

export const HistoryButton = ({ onClick, active }: { onClick: () => void, active: boolean }) => (
    <ToolbarButton icon={<Clock size={18} strokeWidth={1.5} />} title="History" onClick={onClick} active={active} />
);

export const DownloadsButton = ({ onClick, active }: { onClick: () => void, active: boolean }) => {
    const { state } = useBrowser();
    const isDownloading = state.downloads.some(d => d.state === 'progressing');
    return <ToolbarButton icon={<DownloadIcon size={18} strokeWidth={1.5} />} title="Downloads" onClick={onClick} active={active} badge={isDownloading} className={isDownloading ? 'text-blue-400' : ''} />;
};

export const NewIncognitoButton = () => {
    const { dispatch } = useBrowser();
    return <ToolbarButton icon={<VenetianMask size={18} />} title="New Incognito Tab" onClick={() => dispatch({ type: 'NEW_TAB', payload: { incognito: true } })} />;
};

export const SettingsButton = ({ onClick, active }: { onClick: () => void, active: boolean }) => (
    <ToolbarButton icon={<Settings size={18} strokeWidth={1.5} />} title="Settings" onClick={onClick} active={active} />
);

export const ProfileButton = ({ onClick, active }: { onClick: () => void, active: boolean }) => {
    const { state } = useBrowser();
    return (
        <button
            onClick={onClick}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 overflow-hidden border ${active ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-transparent bg-white/10 hover:bg-white/20'}`}
            title="User Profile"
        >
            {state.profile?.avatar ? (
                <img src={state.profile.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xs">
                    {state.profile?.name?.[0] || 'G'}
                </div>
            )}
        </button>
    );
};

export const FlexibleSpacer = () => (
    <div className="flex-1 min-w-[20px] h-8 border border-white/5 border-dashed rounded opacity-0 hover:opacity-50 transition-opacity flex items-center justify-center text-xs text-white/30 truncate select-none">
        Spacer
    </div>
);

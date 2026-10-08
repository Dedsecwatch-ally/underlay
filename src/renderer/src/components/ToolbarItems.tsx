import React from 'react';
import { ChevronLeft, ChevronRight, RotateCw, X, Clock, Settings, ArrowDownToLine, VenetianMask } from 'lucide-react';
import { dispatch, useBrowserState } from '../context/BrowserContext';
import { CommandType } from '../store/browserStore';
import { Avatar, displayIdentity } from './Avatar';
import { shortcut } from '../utils/PlatformUtils';

interface ToolbarButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    active?: boolean;
    disabled?: boolean;
    badge?: boolean;
    className?: string;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, icon, title, active, disabled, badge, className = '' }) => (
    <button
        onClick={onClick}
        title={title}
        aria-label={title}
        disabled={disabled}
        data-active={active ? 'true' : undefined}
        className={`icon-button ${className}`}
    >
        {icon}
        {badge && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-underlay-accent" />}
    </button>
);

const command = (type: CommandType) => () => dispatch({ type: 'TRIGGER_COMMAND', payload: type });

export const BackButton = () => {
    const canGoBack = useBrowserState(s => !!s.tabs.find(t => t.id === s.activeTabId)?.canGoBack);
    return <ToolbarButton icon={<ChevronLeft size={20} strokeWidth={1.75} />} title={`Back (${shortcut('[')})`} disabled={!canGoBack} onClick={command('goBack')} />;
};

export const ForwardButton = () => {
    const canGoForward = useBrowserState(s => !!s.tabs.find(t => t.id === s.activeTabId)?.canGoForward);
    return <ToolbarButton icon={<ChevronRight size={20} strokeWidth={1.75} />} title={`Forward (${shortcut(']')})`} disabled={!canGoForward} onClick={command('goForward')} />;
};

export const ReloadButton = () => {
    const isLoading = useBrowserState(s => s.tabs.find(t => t.id === s.activeTabId)?.status === 'loading');
    return (
        <ToolbarButton
            icon={isLoading ? <X size={16} strokeWidth={1.75} /> : <RotateCw size={15} strokeWidth={1.75} />}
            title={isLoading ? 'Stop Loading' : `Reload (${shortcut('R')})`}
            onClick={command(isLoading ? 'stop' : 'reload')}
        />
    );
};

export const HistoryButton = ({ onClick, active }: { onClick: () => void; active: boolean }) => (
    <ToolbarButton icon={<Clock size={16} strokeWidth={1.75} />} title="History" onClick={onClick} active={active} />
);

export const DownloadsButton = ({ onClick, active }: { onClick: () => void; active: boolean }) => {
    const isDownloading = useBrowserState(s => s.downloads.some(d => d.state === 'progressing'));
    return (
        <ToolbarButton
            icon={<ArrowDownToLine size={16} strokeWidth={1.75} />}
            title="Downloads"
            onClick={onClick}
            active={active}
            badge={isDownloading}
            className={isDownloading ? '!text-underlay-accent' : ''}
        />
    );
};

export const NewIncognitoButton = () => (
    <ToolbarButton
        icon={<VenetianMask size={16} strokeWidth={1.75} />}
        title={`New Private Tab (${shortcut('Shift', 'N')})`}
        onClick={() => dispatch({ type: 'NEW_TAB', payload: { incognito: true } })}
    />
);

export const SettingsButton = ({ onClick, active }: { onClick: () => void; active: boolean }) => (
    <ToolbarButton icon={<Settings size={16} strokeWidth={1.75} />} title={`Settings (${shortcut(',')})`} onClick={onClick} active={active} />
);

export const ProfileButton = ({ onClick, active }: { onClick: () => void; active: boolean }) => {
    const { profile, account } = useBrowserState(s => ({ profile: s.profile, account: s.account }));
    const identity = displayIdentity(profile, account);
    return (
        <button
            onClick={onClick}
            title={account ? `${identity.name} (${account.email})` : 'Profile'}
            aria-label="Profile"
            data-panel-toggle="profile"
            data-active={active ? 'true' : undefined}
            className="icon-button"
        >
            <Avatar name={identity.name} avatar={identity.avatar} size={22} />
        </button>
    );
};

export const FlexibleSpacer = () => <div className="flex-1 min-w-[20px] h-8" />;

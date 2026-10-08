import React from 'react';
import { Plus, X, Volume2, Globe, VenetianMask } from 'lucide-react';
import classNames from 'classnames';
import { dispatch, useBrowserState, Tab } from '../context/BrowserContext';
import { WindowControls } from './WindowControls';
import { isMac, isMobile, shortcut } from '../utils/PlatformUtils';
import { NEW_TAB_URL } from '../store/browserStore';

export function Titlebar() {
    const { tabs, activeTabId } = useBrowserState(s => ({ tabs: s.tabs, activeTabId: s.activeTabId }));
    const showWindowControls = !isMac && !isMobile;

    return (
        <div
            className={classNames(
                'h-10 flex items-end gap-1 bg-underlay-bg select-none app-region-drag relative z-20',
                isMobile ? 'px-2' : isMac ? 'pl-[84px] pr-2' : 'pl-2 pr-[146px]'
            )}
            onDoubleClick={(e) => {
                // Windows/Linux: double-clicking empty title bar space toggles maximise.
                if (!isMac && e.target === e.currentTarget) window.electron?.window.maximize();
            }}
        >
            <div role="tablist" className="flex-1 min-w-0 flex items-end h-full pt-1.5 gap-px">
                {tabs.map((tab, index) => (
                    <TabItem
                        key={tab.id}
                        tab={tab}
                        isActive={tab.id === activeTabId}
                        hideDivider={tab.id === activeTabId || tabs[index + 1]?.id === activeTabId}
                    />
                ))}
                <button
                    onClick={() => dispatch({ type: 'NEW_TAB' })}
                    className="icon-button w-7 h-7 mb-1 ml-1 shrink-0"
                    title={`New Tab (${shortcut('T')})`}
                    aria-label="New Tab"
                >
                    <Plus size={16} strokeWidth={2} />
                </button>
            </div>

            {showWindowControls && (
                <div className="absolute top-0 right-0 h-full">
                    <WindowControls />
                </div>
            )}
        </div>
    );
}

const TabItem = React.memo(function TabItem({ tab, isActive, hideDivider }: { tab: Tab; isActive: boolean; hideDivider: boolean }) {
    const close = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch({ type: 'CLOSE_TAB', payload: { id: tab.id } });
    };
    const title = tab.url === NEW_TAB_URL ? (tab.incognito ? 'Private Tab' : 'New Tab') : tab.title || tab.url;

    return (
        <div
            role="tab"
            aria-selected={isActive}
            title={title}
            onMouseDown={(e) => {
                if (e.button === 0) dispatch({ type: 'SWITCH_TAB', payload: { id: tab.id } });
            }}
            onAuxClick={(e) => {
                if (e.button === 1) close(e);
            }}
            className={classNames(
                'group relative h-[34px] flex-1 min-w-[44px] max-w-[232px] flex items-center gap-2 pl-3 pr-1.5 rounded-t-[10px] text-[12px] animate-fade-in',
                'transition-[background-color,color] duration-150',
                isActive
                    ? 'bg-underlay-surface text-underlay-text z-10 shadow-[0_-0.5px_0_0.5px_var(--underlay-hairline)]'
                    : 'text-underlay-text/60 hover:bg-underlay-text/[0.05] hover:text-underlay-text/85',
                tab.incognito && isActive && 'bg-[#2a2440] text-[#e5ddff]'
            )}
        >
            <TabIcon tab={tab} />
            <span
                className="flex-1 min-w-0 overflow-hidden whitespace-nowrap font-medium tracking-[-0.005em]"
                style={{ maskImage: 'linear-gradient(to right, black calc(100% - 16px), transparent)' }}
            >
                {title}
            </span>
            {tab.audible && <Volume2 size={13} className="shrink-0 text-underlay-text/50" aria-label="Playing audio" />}
            <button
                onClick={close}
                onMouseDown={(e) => e.stopPropagation()}
                className={classNames(
                    'shrink-0 w-5 h-5 rounded-[5px] flex items-center justify-center text-underlay-text/50 hover:text-underlay-text hover:bg-underlay-text/10 transition-opacity duration-100',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
                aria-label={`Close ${title}`}
            >
                <X size={12} strokeWidth={2.25} />
            </button>
            {!hideDivider && <span className="absolute right-[-1px] top-2 bottom-2 w-px bg-underlay-text/10" />}
        </div>
    );
});

function TabIcon({ tab }: { tab: Tab }) {
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => setFailed(false), [tab.favicon]);

    if (tab.status === 'loading') {
        return (
            <span className="shrink-0 w-4 h-4 rounded-full border-[1.5px] border-underlay-accent/25 border-t-underlay-accent animate-spin" />
        );
    }
    if (tab.incognito && tab.url === NEW_TAB_URL) return <VenetianMask size={15} className="shrink-0 opacity-70" />;
    if (tab.favicon && !failed) {
        return <img src={tab.favicon} alt="" draggable={false} className="shrink-0 w-4 h-4 rounded-[3px] object-contain" onError={() => setFailed(true)} />;
    }
    return <Globe size={15} strokeWidth={1.75} className="shrink-0 opacity-50" />;
}

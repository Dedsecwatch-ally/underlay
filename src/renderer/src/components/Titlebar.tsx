import React, { MouseEvent } from 'react';
import { useBrowser, Tab } from '../context/BrowserContext';
import { X, Plus, Loader2 } from 'lucide-react';
import { WindowControls } from './WindowControls';
import classNames from 'classnames';
import { motion, LayoutGroup } from 'framer-motion';

export function Titlebar() {
    const { state, dispatch } = useBrowser();

    const handleNewTab = () => {
        dispatch({ type: 'NEW_TAB' });
    };

    const handleCloseTab = (e: MouseEvent, id: string) => {
        e.stopPropagation();
        dispatch({ type: 'CLOSE_TAB', payload: { id } });
    };

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    // On mobile, we don't need window control padding, but we might want some left padding
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const paddingClass = isMobile ? 'px-2' : (isMac ? 'pl-20 pr-2' : 'pl-2 pr-40');

    return (
        <div className={`h-14 bg-underlay-bg flex items-end ${paddingClass} pt-2 gap-2 select-none app-region-drag border-b border-underlay-border z-20 relative shadow-sm`}>
            <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar items-end">
                <LayoutGroup>
                    {state.tabs.map((tab) => (
                        <TabItem
                            key={tab.id}
                            tab={tab}
                            isActive={tab.id === state.activeTabId}
                            onClose={(e) => handleCloseTab(e, tab.id)}
                            onClick={() => dispatch({ type: 'SWITCH_TAB', payload: { id: tab.id } })}
                        />
                    ))}
                </LayoutGroup>
                <motion.button
                    layout
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNewTab}
                    className="h-8 w-8 flex items-center justify-center text-underlay-text/50 rounded-md transition-colors mb-0.5 app-region-no-drag hover:text-white"
                >
                    <Plus size={16} />
                </motion.button>

            </div>
            {
                !isMac && !isMobile && (
                    <div className="absolute top-0 right-0 h-full z-50">
                        <WindowControls />
                    </div>
                )
            }
        </div >
    );
}

function TabItem({ tab, isActive, onClose, onClick }: { tab: Tab, isActive: boolean, onClose: (e: MouseEvent) => void, onClick: () => void }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, width: 0, scale: 0.8 }}
            animate={{ opacity: 1, width: 'auto', scale: 1 }}
            exit={{ opacity: 0, width: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            onClick={onClick}
            className={classNames(
                "group h-8 px-3 min-w-[140px] max-w-[220px] flex items-center gap-2 rounded-t-lg text-xs cursor-default overflow-hidden relative border-t border-r border-l border-underlay-border shadow-lg app-region-no-drag",
                isActive ? "bg-underlay-surface text-underlay-text z-10" : "bg-underlay-text/5 text-underlay-text/40 hover:bg-underlay-text/10 z-0 mb-0.5"
            )}
        >
            {tab.status === 'loading' && (
                <Loader2 size={12} className="animate-spin text-blue-500" />
            )}
            <span className="flex-1 truncate font-medium tracking-wide">{tab.title || 'Loading...'}</span>
            <motion.button
                whileHover={{ scale: 1.2, backgroundColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className={classNames(
                    "p-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10",
                    isActive && "opacity-100" // Always show close on active
                )}
            >
                <X size={12} />
            </motion.button>

            {isActive && (
                <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80"
                />
            )}
        </motion.div>
    );
}

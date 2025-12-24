import React, { MouseEvent } from 'react';
import { useBrowser, Tab } from '../context/BrowserContext';
import { X, Plus } from 'lucide-react';
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
    const paddingClass = isMac ? 'pl-20 pr-2' : 'pl-2 pr-40';

    return (
        <div className={`h-10 bg-underlay-bg/90 backdrop-blur-xl flex items-end ${paddingClass} pt-2 gap-2 select-none app-region-drag border-b border-underlay-border z-20 relative shadow-sm`}>
            <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar app-region-no-drag items-end">
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
                    whileHover={{ scale: 1.1, backgroundColor: 'var(--underlay-text, rgba(255,255,255,0.1))' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNewTab}
                    className="h-8 w-8 flex items-center justify-center text-underlay-text/50 rounded-md transition-colors mb-0.5"
                >
                    <Plus size={16} />
                </motion.button>
            </div>
        </div>
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
                "group h-8 px-3 min-w-[140px] max-w-[220px] flex items-center gap-2 rounded-t-lg text-xs cursor-default overflow-hidden relative border-t border-r border-l border-underlay-border shadow-lg",
                isActive ? "bg-underlay-surface text-underlay-text z-10" : "bg-underlay-text/5 text-underlay-text/40 hover:bg-underlay-text/10 z-0 mb-0.5"
            )}
        >
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

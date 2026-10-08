import React, { useEffect, useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { dispatch, useBrowserState } from '../context/BrowserContext';
import { AddressBar } from './AddressBar';
import { BackButton, ForwardButton, ReloadButton, HistoryButton, DownloadsButton, SettingsButton, ProfileButton, FlexibleSpacer, NewIncognitoButton } from './ToolbarItems';

const toggle = (payload: 'toggleHistory' | 'toggleDownloads' | 'toggleSettings' | 'toggleProfile') => () =>
    dispatch({ type: 'TRIGGER_COMMAND', payload });

function renderItem(id: string) {
    switch (id) {
        case 'back': return <BackButton />;
        case 'forward': return <ForwardButton />;
        case 'reload': return <ReloadButton />;
        case 'urlbar': return <AddressBar />;
        case 'flexible':
        case 'spacer': return <FlexibleSpacer />;
        case 'history': return <HistoryButton onClick={toggle('toggleHistory')} active={false} />;
        case 'downloads': return <DownloadsButton onClick={toggle('toggleDownloads')} active={false} />;
        case 'settings': return <SettingsButton onClick={toggle('toggleSettings')} active={false} />;
        case 'profile': return <ProfileButton onClick={toggle('toggleProfile')} active={false} />;
        case 'incognito': return <NewIncognitoButton />;
        default: return null;
    }
}

// Defined at module level: declaring it inside Toolbar made React remount
// every toolbar item (including the address bar, losing focus and typed
// text) on each render.
function ToolbarItem({ item, customizing }: { item: string; customizing: boolean }) {
    const grows = item === 'urlbar' || item === 'flexible';
    return (
        <Reorder.Item
            value={item}
            id={item}
            className={grows ? 'flex-1 min-w-0 flex' : 'flex-none'}
            style={grows ? { flexBasis: 0 } : undefined}
            dragListener={customizing}
            whileDrag={{ scale: 1.04, zIndex: 100 }}
        >
            <div className={`h-full flex items-center w-full ${customizing ? 'rounded-lg outline outline-1 outline-dashed outline-underlay-text/25 cursor-grab' : ''}`}>
                <div className={customizing ? 'pointer-events-none w-full flex' : 'w-full flex'}>{renderItem(item)}</div>
            </div>
        </Reorder.Item>
    );
}

export const Toolbar = () => {
    const { toolbarLayout, isCustomizingToolbar, incognito } = useBrowserState(s => ({
        toolbarLayout: s.toolbarLayout,
        isCustomizingToolbar: s.isCustomizingToolbar,
        incognito: !!s.tabs.find(t => t.id === s.activeTabId)?.incognito
    }));
    const [items, setItems] = useState(toolbarLayout);
    useEffect(() => setItems(toolbarLayout), [toolbarLayout]);

    return (
        <div className="flex flex-col relative z-30">
            <AnimatePresence initial={false}>
                {isCustomizingToolbar && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-underlay-accent text-white"
                    >
                        <div className="flex justify-between items-center px-4 py-1.5 text-[12px] font-medium">
                            <span>Drag items to rearrange the toolbar</span>
                            <div className="flex gap-2">
                                <button onClick={() => dispatch({ type: 'RESET_TOOLBAR_LAYOUT' })} className="px-2.5 py-0.5 rounded-md bg-black/15 hover:bg-black/25">Restore Default</button>
                                <button onClick={() => dispatch({ type: 'TOGGLE_CUSTOMIZE_TOOLBAR' })} className="px-2.5 py-0.5 rounded-md bg-white text-underlay-accent font-semibold">Done</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                className={`h-11 flex items-center px-2 border-b hairline app-region-drag transition-colors duration-200 ${incognito ? 'bg-[#2a2440]' : 'bg-underlay-surface'}`}
            >
                <Reorder.Group
                    axis="x"
                    values={items}
                    onReorder={(order: string[]) => {
                        setItems(order);
                        dispatch({ type: 'SET_TOOLBAR_LAYOUT', payload: order });
                    }}
                    className="flex flex-1 min-w-0 items-center gap-0.5"
                >
                    {items.map(item => (
                        <ToolbarItem key={item} item={item} customizing={isCustomizingToolbar} />
                    ))}
                </Reorder.Group>
            </div>
        </div>
    );
};

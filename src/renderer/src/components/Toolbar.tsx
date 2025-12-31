import React, { useEffect, useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { useBrowser } from '../context/BrowserContext';
import { AddressBar } from './AddressBar';
import { BackButton, ForwardButton, ReloadButton, HistoryButton, DownloadsButton, SettingsButton, ProfileButton, FlexibleSpacer, ToolbarButton, NewIncognitoButton } from './ToolbarItems';
import { Search, Plus } from 'lucide-react';

export const Toolbar = () => {
    const { state, dispatch } = useBrowser();
    const { toolbarLayout, isCustomizingToolbar } = state;

    // Local state for smooth drag interactions before committing to global store
    const [items, setItems] = useState(toolbarLayout);

    useEffect(() => {
        setItems(toolbarLayout);
    }, [toolbarLayout]);

    const handleReorder = (newOrder: string[]) => {
        setItems(newOrder);
        // Dispatch immediately for responsiveness, debouncing could be added if heavy
        dispatch({ type: 'SET_TOOLBAR_LAYOUT', payload: newOrder });
    };

    const renderItem = (id: string) => {
        switch (id) {
            case 'back': return <BackButton />;
            case 'forward': return <ForwardButton />;
            case 'reload': return <ReloadButton />;
            case 'urlbar': return <div className="flex-1 min-w-[300px] w-full"><AddressBar /></div>;
            case 'flexible': return <div className="flex-1" />;
            case 'history': return <HistoryButton onClick={() => dispatch({ type: 'TRIGGER_COMMAND', payload: 'toggleHistory' })} active={false} />;
            case 'downloads': return <DownloadsButton onClick={() => dispatch({ type: 'TRIGGER_COMMAND', payload: 'toggleDownloads' })} active={false} />;
            case 'settings': return <SettingsButton onClick={() => dispatch({ type: 'TRIGGER_COMMAND', payload: 'toggleSettings' })} active={false} />;
            case 'profile': return <ProfileButton onClick={() => dispatch({ type: 'TRIGGER_COMMAND', payload: 'toggleProfile' })} active={false} />;
            case 'incognito': return <NewIncognitoButton />;
            // Add more items here
            case 'spacer': return <FlexibleSpacer />;
            default: return null;
        }
    };

    // Wrapper for reorderable items
    const ItemWrapper = ({ item, children }: { item: string, children: React.ReactNode }) => {
        return (
            <Reorder.Item
                value={item}
                id={item}
                className={item === 'urlbar' || item === 'flexible' ? 'flex-1 flex' : 'flex-none'}
                dragListener={isCustomizingToolbar}
                whileDrag={{ scale: 1.05, zIndex: 100 }}
            >
                <div className={`relative h-full flex items-center w-full ${isCustomizingToolbar ? 'border border-dashed border-white/20 rounded p-0.5 hover:bg-white/5 cursor-move' : ''}`}>
                    {children}
                    {isCustomizingToolbar && (
                        <div className="absolute -top-2 -right-2 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity" title="Remove">
                            <span className="text-[10px] font-bold text-white">x</span>
                        </div>
                    )}
                </div>
            </Reorder.Item>
        );
    };

    return (
        <div className="flex flex-col relative z-50">

            {/* Customization Header */}
            <AnimatePresence>
                {isCustomizingToolbar && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-indigo-600 text-white text-xs font-bold px-4 py-1 flex justify-between items-center"
                    >
                        <span>DRAG ITEMS TO REARRANGE</span>
                        <div className="flex gap-2">
                            <button onClick={() => dispatch({ type: 'RESET_TOOLBAR_LAYOUT' })} className="px-2 py-0.5 bg-black/20 rounded hover:bg-black/40">Reset Default</button>
                            <button onClick={() => dispatch({ type: 'TOGGLE_CUSTOMIZE_TOOLBAR' })} className="px-3 py-0.5 bg-white text-indigo-600 rounded hover:bg-indigo-50">Done</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="h-12 bg-underlay-surface border-b border-underlay-border flex items-center px-2 gap-1 overflow-visible">
                <Reorder.Group axis="x" values={items} onReorder={handleReorder} className="flex flex-1 items-center gap-1 w-full relative">
                    {items.map((item) => (
                        <ItemWrapper key={item} item={item}>
                            {renderItem(item)}
                        </ItemWrapper>
                    ))}
                </Reorder.Group>
            </div>
        </div>
    );
};

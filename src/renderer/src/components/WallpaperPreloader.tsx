import { useEffect } from 'react';
import { CUSTOM_WALLPAPERS } from '../constants/wallpapers';

export function WallpaperPreloader() {
    useEffect(() => {
        // Initial Preload (Next 3)
        preloadNext(getStoredIndex());

        // Listen for changes
        const handleChange = (e: CustomEvent) => {
            preloadNext(e.detail.index);
        };

        window.addEventListener('wallpaper-changed', handleChange as any);
        return () => window.removeEventListener('wallpaper-changed', handleChange as any);
    }, []);

    const getStoredIndex = () => {
        const storedIndex = localStorage.getItem('wallpaperIndex');
        return storedIndex ? parseInt(storedIndex, 10) : -1;
    };

    const preloadNext = (currentIndex: number) => {
        // Preload next 3 wallpapers to be super safe
        for (let i = 1; i <= 3; i++) {
            const nextIndex = (currentIndex + i) % CUSTOM_WALLPAPERS.length;
            const img = new Image();
            img.src = CUSTOM_WALLPAPERS[nextIndex];
            // We don't need to do anything with it, browser cache handles the rest
        }
    };

    return null; // Invisible
}

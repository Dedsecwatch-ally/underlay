import { useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useBrowser } from '../context/BrowserContext';
import { isMobile } from '../utils/PlatformUtils';

export function useMobileGestures() {
    const { state, dispatch } = useBrowser();
    const touchStart = useRef<{ x: number, y: number } | null>(null);
    const minSwipeDistance = 100;

    useEffect(() => {
        if (!isMobile) return;

        const handleTouchStart = (e: TouchEvent) => {
            touchStart.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        };

        const handleTouchEnd = async (e: TouchEvent) => {
            if (!touchStart.current) return;

            const touchEnd = {
                x: e.changedTouches[0].clientX,
                y: e.changedTouches[0].clientY
            };

            const deltaX = touchEnd.x - touchStart.current.x;
            const deltaY = touchEnd.y - touchStart.current.y;

            // Check if horizontal swipe and mostly horizontal
            if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) {
                    // Right swipe -> Go Back
                    Haptics.impact({ style: ImpactStyle.Medium });
                    dispatch({ type: 'TRIGGER_COMMAND', payload: 'goBack' });
                } else {
                    // Left swipe -> Go Forward
                    Haptics.impact({ style: ImpactStyle.Medium });
                    dispatch({ type: 'TRIGGER_COMMAND', payload: 'goForward' });
                }
            }

            touchStart.current = null;
        };

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isMobile, dispatch]);
}

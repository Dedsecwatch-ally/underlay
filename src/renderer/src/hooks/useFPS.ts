import { useState, useEffect, useRef } from 'react';

export function useFPS() {
    const [fps, setFps] = useState(60);
    const frameCount = useRef(0);
    const lastTime = useRef(performance.now());
    const requestRef = useRef<number | null>(null);

    useEffect(() => {
        const loop = (time: number) => {
            frameCount.current++;
            if (time - lastTime.current >= 1000) {
                setFps(Math.round((frameCount.current * 1000) / (time - lastTime.current)));
                frameCount.current = 0;
                lastTime.current = time;
            }
            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return fps;
}

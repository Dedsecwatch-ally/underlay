import { CarTaxiFront } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

export function NetworkGraph({ logs }: { logs: any[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;

        // Particles
        interface Particle {
            x: number;
            y: number;
            speed: number;
            color: string;
            createdAt: number;
        }
        let particles: Particle[] = [];

        // Spawn particles based on recent logs
        const spawnParticles = () => {
            const now = Date.now();
            const recentLogs = logs.filter(l => (now - l.startTime) < 200); // Very recent

            recentLogs.forEach(log => {
                if (Math.random() > 0.3) return; // Limit density
                const color = log.method === 'GET' ? '#60a5fa' : log.method === 'POST' ? '#4ade80' : '#fbbf24';
                particles.push({
                    x: 0,
                    y: Math.random() * canvas.height,
                    speed: 2 + Math.random() * 3,
                    color,
                    createdAt: now
                });
            });
        };

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;

            // Fade effect trail
            ctx.fillStyle = 'rgba(26, 26, 30, 0.2)';
            ctx.fillRect(0, 0, width, height);

            spawnParticles();

            // Update & Draw Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.speed;

                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                ctx.fill();

                if (p.x > width) {
                    particles.splice(i, 1);
                }
            }

            // Grid Overlay
            ctx.strokeStyle = '#ffffff05';
            ctx.beginPath();
            for (let x = 0; x < width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
            ctx.stroke();

            animationId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationId);
    }, [logs]);

    return (
        <canvas
            ref={canvasRef}
            width={330}
            height={60}
            className="w-full h-[60px] bg-black/20 rounded border border-white/5 mb-2"
        />
    );
}

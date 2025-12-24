import React, { useEffect, useRef } from 'react';

interface PermissionNode {
    id: string;
    type: 'origin' | 'sensor';
    label: string;
    x?: number;
    y?: number;
}

interface PermissionLink {
    source: string;
    target: string;
}

export function PermissionGraph({ permissions, onRevoke }: { permissions: any[], onRevoke: (origin: string, perm: string) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Build Graph Data
        const nodes: PermissionNode[] = [];
        const links: PermissionLink[] = [];

        // Sensors (Right side)
        const sensors = ['media', 'geolocation', 'notifications', 'midi'];
        sensors.forEach((s, i) => {
            nodes.push({
                id: s,
                type: 'sensor',
                label: s === 'media' ? 'Camera/Mic' : s,
                x: 250,
                y: 50 + (i * 40)
            });
        });

        // Origins (Left side)
        const origins = Array.from(new Set(permissions.map(p => p.origin)));
        origins.forEach((o, i) => {
            nodes.push({
                id: o,
                type: 'origin',
                label: new URL(o).hostname,
                x: 50,
                y: 50 + (i * 40)
            });
        });

        // Links
        permissions.forEach(p => {
            links.push({ source: p.origin, target: p.permission });
        });

        // Render
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Links
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            links.forEach(l => {
                const sourceNode = nodes.find(n => n.id === l.source);
                const targetNode = nodes.find(n => n.id === l.target) || nodes.find(n => n.id === 'media'); // Fallback for specific media types

                if (sourceNode && targetNode) {
                    ctx.beginPath();
                    ctx.moveTo(sourceNode.x!, sourceNode.y!);
                    ctx.bezierCurveTo(
                        sourceNode.x! + 50, sourceNode.y!,
                        targetNode.x! - 50, targetNode.y!,
                        targetNode.x!, targetNode.y!
                    );
                    ctx.stroke();
                }
            });

            // Draw Nodes
            nodes.forEach(n => {
                ctx.fillStyle = n.type === 'origin' ? '#ffffff' : '#fbbf24';
                ctx.beginPath();
                ctx.arc(n.x!, n.y!, 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.font = '10px monospace';
                ctx.textAlign = n.type === 'origin' ? 'right' : 'left';
                ctx.fillText(n.label, n.type === 'origin' ? n.x! - 10 : n.x! + 10, n.y! + 3);
            });
        };

        render();

        // Simple click handler for revocation (origin side)
        const handleClick = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            nodes.forEach(n => {
                if (n.type === 'origin' && Math.hypot(n.x! - x, n.y! - y) < 10) {
                    // Find permissions for this origin and revoke all (simple prototype behavior)
                    const perms = permissions.filter(p => p.origin === n.id);
                    perms.forEach(p => onRevoke(p.origin, p.permission));
                }
            });
        };

        canvas.addEventListener('click', handleClick);
        return () => canvas.removeEventListener('click', handleClick);

    }, [permissions]);

    return (
        <div className="flex flex-col items-center">
            <canvas ref={canvasRef} width={300} height={200} className="bg-white/5 rounded border border-white/10 mb-2 cursor-pointer" />
            <div className="text-[9px] opacity-40">Click origin node to revoke all</div>
        </div>
    );
}

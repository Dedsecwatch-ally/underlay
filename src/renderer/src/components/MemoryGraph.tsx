import { motion } from 'framer-motion';

export function MemoryGraph({ history, width = 300, height = 60 }: { history: any[], width?: number, height?: number }) {
    if (history.length < 2) return <div style={{ width, height }} className="bg-black/20 rounded border border-white/5 mb-2 flex items-center justify-center text-white/20">Waiting...</div>;

    const maxHeap = 200; // MB
    const maxRSS = 1000; // MB

    // Convert history to SVG path
    const createPath = (key: string, max: number) => {
        const step = width / 60;
        const points = history.map((val, i) => {
            const x = width - ((history.length - 1 - i) * step);
            const y = height - ((val[key] / max) * height);
            return `${x},${y}`;
        }).join(' L ');
        return `M 0,${height} L ${points} L ${width},${height} Z`;
    };

    return (
        <div style={{ width, height }} className="bg-black/20 rounded border border-white/5 mb-2 relative overflow-hidden">
            {/* Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />

            <svg width={width} height={height} className="absolute inset-0">
                <motion.path
                    d={createPath('rss', maxRSS)}
                    fill="rgba(59, 130, 246, 0.2)"
                    stroke="#3b82f6"
                    strokeWidth={1}
                    animate={{ d: createPath('rss', maxRSS) }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                />
                <motion.path
                    d={createPath('heap', maxHeap)}
                    fill="rgba(251, 191, 36, 0.2)"
                    stroke="#fbbf24"
                    strokeWidth={1}
                    animate={{ d: createPath('heap', maxHeap) }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                />
            </svg>
        </div>
    );
}

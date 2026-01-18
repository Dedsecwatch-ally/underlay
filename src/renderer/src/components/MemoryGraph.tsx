import React from 'react';

export function MemoryGraph({ history, width, height }: { history: any[], width: number, height: number }) {
    return (
        <div style={{ width, height, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-[10px] opacity-30">Memory Graph Placeholder</span>
        </div>
    );
}

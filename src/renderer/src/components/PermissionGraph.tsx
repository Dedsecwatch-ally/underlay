import React from 'react';

export function PermissionGraph({ permissions, onRevoke }: { permissions: any[], onRevoke: (origin: string, permission: string) => void }) {
    return (
        <div className="h-20 bg-white/5 rounded flex items-center justify-center">
            <span className="text-[10px] opacity-30">Permission Graph Placeholder</span>
        </div>
    );
}

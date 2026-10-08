import React from 'react';

// Windows 11 caption buttons (46px wide, Segoe Fluent-style glyphs).
const Glyph = ({ d }: { d: string }) => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
        <path d={d} />
    </svg>
);

export function WindowControls() {
    const controls = window.electron?.window;
    if (!controls) return null;

    const base = 'h-full w-[46px] flex items-center justify-center text-underlay-text/80 transition-colors duration-100';
    return (
        <div className="flex h-full app-region-no-drag">
            <button onClick={controls.minimize} className={`${base} hover:bg-underlay-text/10`} aria-label="Minimize">
                <Glyph d="M0 5.5h10" />
            </button>
            <button onClick={controls.maximize} className={`${base} hover:bg-underlay-text/10`} aria-label="Maximize">
                <Glyph d="M.5.5h9v9h-9z" />
            </button>
            <button onClick={controls.close} className={`${base} hover:bg-[#c42b1c] hover:text-white`} aria-label="Close">
                <Glyph d="M0 0l10 10M10 0L0 10" />
            </button>
        </div>
    );
}

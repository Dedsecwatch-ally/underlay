/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--underlay-${name}) / <alpha-value>)`;

module.exports = {
    content: [
        "./src/renderer/index.html",
        "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'underlay-bg': token('bg'),
                'underlay-surface': token('surface'),
                'underlay-elevated': token('elevated'),
                'underlay-accent': token('accent'),
                'underlay-text': token('text'),
                'underlay-border': 'rgb(var(--underlay-text) / 0.09)',
            },
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI Variable Text"', '"Segoe UI"', 'Inter', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
                mono: ['ui-monospace', '"SF Mono"', '"Cascadia Code"', 'Menlo', 'Consolas', 'monospace'],
            },
            boxShadow: {
                popover: '0 0 0 0.5px rgb(0 0 0 / 0.25), 0 12px 40px -8px rgb(0 0 0 / 0.45), 0 4px 12px -4px rgb(0 0 0 / 0.25)',
                sheet: '0 0 0 0.5px rgb(0 0 0 / 0.3), 0 30px 80px -12px rgb(0 0 0 / 0.55)',
            },
            transitionTimingFunction: {
                apple: 'cubic-bezier(0.32, 0.72, 0, 1)',
            },
            keyframes: {
                'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
                'progress': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(250%)' } },
            },
            animation: {
                'fade-in': 'fade-in 0.35s cubic-bezier(0.32, 0.72, 0, 1) both',
                'progress': 'progress 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            },
        }
    },
    plugins: [],
}

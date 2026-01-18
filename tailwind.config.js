/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/renderer/index.html",
        "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'underlay-bg': 'var(--underlay-bg)',
                'underlay-surface': 'var(--underlay-surface)',
                'underlay-accent': 'var(--underlay-accent)',
                'underlay-text': 'var(--underlay-text)',
                'underlay-border': 'var(--underlay-border)',
            }
        },
    },
    plugins: [],
}

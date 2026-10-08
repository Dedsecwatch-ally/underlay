import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { join } from 'path'

// The browser UI is privileged (it can talk to the main process), so it gets a
// strict CSP. Only the dev server needs inline scripts and websockets for HMR.
function contentSecurityPolicy(): Plugin {
    let dev = false;
    return {
        name: 'underlay-csp',
        configResolved(config) {
            dev = config.command === 'serve';
        },
        transformIndexHtml() {
            const directives = [
                "default-src 'self'",
                `script-src 'self'${dev ? " 'unsafe-inline' http://localhost:5173" : ''}`,
                "style-src 'self' 'unsafe-inline'",
                // Favicons, reader-mode images and wallpapers come from the web.
                "img-src 'self' data: blob: https:",
                "font-src 'self' data:",
                `connect-src 'self' https://api.open-meteo.com${dev ? ' ws://localhost:5173 http://localhost:5173' : ''}`,
                // Tabs are <iframe>s only in the mobile build.
                "frame-src https: http:",
                "object-src 'none'",
                "base-uri 'none'",
                "form-action 'none'"
            ];
            return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: directives.join('; ') }, injectTo: 'head-prepend' }];
        }
    };
}

export default defineConfig({
    plugins: [react(), contentSecurityPolicy()],
    root: join(__dirname, 'src/renderer'),
    publicDir: 'public',
    base: './',
    build: {
        outDir: join(__dirname, 'dist/renderer'),
        emptyOutDir: true,
        target: 'chrome130',
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'framer-motion'],
                    'ui-vendor': ['lucide-react']
                }
            }
        }
    },
    server: {
        port: 5173,
        strictPort: true,
    }
})

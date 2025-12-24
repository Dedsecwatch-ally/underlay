import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { join } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    root: join(__dirname, 'src/renderer'),
    publicDir: 'public',
    base: './',
    build: {
        outDir: join(__dirname, 'dist/renderer'),
        emptyOutDir: true,
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
    }
})

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({ plugins: [react(), tailwind(), VitePWA({ registerType: 'prompt', includeAssets: ['icon.svg'], manifest: { name: 'Arcadia Arcade', short_name: 'Arcadia', description: 'Your pocket arcade', theme_color: '#111510', background_color: '#111510', display: 'standalone', start_url: '/', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] }, workbox: { navigateFallbackDenylist: [/^\/api/, /^\/socket.io/], globPatterns: ['**/*.{js,css,html,svg,woff2}'] } })], server: { proxy: { '/api': 'http://127.0.0.1:3001', '/socket.io': { target: 'http://127.0.0.1:3001', ws: true } } } });

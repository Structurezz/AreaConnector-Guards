import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/mask.svg'],
      manifest: {
        name: 'AreaConnect Security',
        short_name: 'AC Guards',
        description: 'Gate verification terminal — works offline',
        theme_color: '#1D4ED8',
        background_color: '#F8FAFC',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/icon.svg',  sizes: '192x192 512x512', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/mask.svg',  sizes: '512x512',          type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Visitor list — keep the most recent response for offline fallback.
            urlPattern: /\/api\/visitors(?:\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'visitors-list-v1',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 10, maxAgeSeconds: 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Verify-code lookups — cached so a scan while offline can still
            // resolve a visitor the server has already told us about.
            urlPattern: /\/api\/visitors\/verify\/.+$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'visitor-verify-v1',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 100, maxAgeSeconds: 12 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/auth\/me$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'auth-me-v1',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 1, maxAgeSeconds: 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/estates\/.+\/constitution\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'constitution-v1',
              expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api':     { target: 'http://localhost:5008', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5008', changeOrigin: true },
    },
  },
});

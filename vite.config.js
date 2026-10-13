import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Replaces <!--GOOGLE_TAGS_HERE--> in index.html with the Search Console
// verification tag (VITE_GOOGLE_SITE_VERIFICATION) and the GA4 snippet
// (VITE_GA_MEASUREMENT_ID). Either can be unset — nothing is emitted for it.
// Page views are sent per route by src/components/SeoTracker.jsx, so the
// automatic one is disabled here to avoid double counting.
function injectGoogleTags(env) {
  return {
    name: 'inject-google-tags',
    transformIndexHtml(html) {
      const parts = [];
      const verify = (env.VITE_GOOGLE_SITE_VERIFICATION || '').trim();
      const gaId   = (env.VITE_GA_MEASUREMENT_ID || '').trim();
      if (verify) parts.push(`<meta name="google-site-verification" content="${verify}" />`);
      if (gaId) {
        parts.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', { anonymize_ip: true, send_page_view: false });
    </script>`);
      }
      return html.replace('<!--GOOGLE_TAGS_HERE-->', parts.join('\n    ') || '<!-- google tags: none configured -->');
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    injectGoogleTags(loadEnv(mode, process.cwd(), '')),
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
}));

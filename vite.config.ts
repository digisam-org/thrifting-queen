import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const basePath = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/angi-avatar.png',
        'icons/icon-192.svg',
        'icons/icon-512.svg',
        'data/scotland-places.json',
        'data/personal-picks.json',
      ],
      manifest: {
        name: 'Thrifting Queen',
        short_name: 'Thrifting Queen',
        description:
          'Discover Scotland’s best cafes, bookshops, charity shops, and antique shops around you.',
        theme_color: '#FAF6F0',
        background_color: '#FAF6F0',
        display: 'standalone',
        orientation: 'portrait',
        scope: basePath,
        start_url: basePath,
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // Allow up to 10 MB for full Scotland places JSON
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}'],
        runtimeCaching: [
          {
            // Cache OpenFreeMap style, sprites, glyphs & vector tiles for smoother repeat/offline visits
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 14, // 14 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});

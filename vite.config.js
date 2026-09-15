import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Base path must match the GitHub Pages repo name (see CLAUDE.md — Deployment model).
// Change this if the repo is renamed.
const REPO_NAME = 'skytrain-chase';

export default defineConfig({
  base: `/${REPO_NAME}/`,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/favicon-32.png',
        'icons/apple-touch-icon.png'
      ],
      manifest: {
        name: 'SkyTrain Chase',
        short_name: 'SkyTrain Chase',
        description: 'משחק מבוך על מסילות הסקייטריין של ונקובר',
        lang: 'he',
        dir: 'rtl',
        theme_color: '#0B1220',
        background_color: '#0B1220',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Cache-first for built assets, since this is a fully offline game
        // with no live data to keep fresh (network-first would just add
        // latency for content that never changes at runtime).
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'skytrain-chase-images' }
          }
        ]
      }
    })
  ]
});

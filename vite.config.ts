import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE permite publicar en una subcarpeta (p. ej. GitHub Pages: /atlas/).
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/atlas.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'ATLAS — Travel Control Center',
        short_name: 'ATLAS',
        description: 'Planifica y gestiona tus viajes, con y sin conexión.',
        lang: 'es',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F7F3EC',
        theme_color: '#F7F3EC',
        categories: ['travel', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
        // Las splash de iOS solo se usan al instalar; no hace falta precachearlas.
        globIgnores: ['**/icons/splash-*', '**/world/*.jpg', '**/world/credits.json'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Las teselas de OpenStreetMap NO se guardan en el Service Worker:
        // su política de uso prohíbe la descarga masiva / offline.
        runtimeCaching: [
          {
            // Fotos de monumentos del Mundo ATLAS: se guardan al verlas por primera vez.
            urlPattern: ({ url }: { url: URL }) => url.pathname.includes('/world/') && url.pathname.endsWith('.jpg'),
            handler: 'CacheFirst',
            options: { cacheName: 'atlas-world-photos', expiration: { maxEntries: 220 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: { chunkSizeWarningLimit: 900 },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
} as never);

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
      includeAssets: ['icons/atlas.svg', 'icons/apple-touch-icon.png', 'welcome.jpg'],
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
        background_color: '#F2F3F5',
        theme_color: '#F2F3F5',
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
        // Mapas (OpenFreeMap): las zonas que el usuario abre con conexión quedan guardadas para verlas
        // igual sin conexión. No se descargan zonas de forma masiva (condiciones de OpenFreeMap: como
        // mucho 3.000 teselas o 50 MB por descarga). Las teselas de openstreetmap.org no se usan.
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.hostname === 'tiles.openfreemap.org' && url.pathname.endsWith('.pbf') && !url.pathname.includes('/fonts/'),
            handler: 'CacheFirst',
            options: { cacheName: 'atlas-map-tiles', expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 24 * 3600 }, cacheableResponse: { statuses: [200] } },
          },
          {
            // Estilo, TileJSON, iconos y tipografías del mapa: se actualizan con conexión y se usan sin ella.
            urlPattern: ({ url }: { url: URL }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'atlas-map-style', expiration: { maxEntries: 400, maxAgeSeconds: 120 * 24 * 3600 }, cacheableResponse: { statuses: [200] } },
          },
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

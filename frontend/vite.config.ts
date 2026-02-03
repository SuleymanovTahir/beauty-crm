import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { filterPreloadsPlugin } from "./vite-plugin-filter-preloads";
import { VitePWA } from 'vite-plugin-pwa';

const BACKEND_PORT = process.env.BACKEND_PORT || "8000";
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const BACKEND_WS_URL = `ws://localhost:${BACKEND_PORT}`;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    filterPreloadsPlugin(),
    // PWA generation can be flaky in CI/sandboxed environments and is not needed for SEO prerender.
    // Enable it by default, but allow disabling via env: PRERENDER=1
    ...(process.env.PRERENDER === '1'
      ? []
      : [VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.webp', 'apple-touch-icon.png', 'logo.webp'],
        manifest: {
          name: 'M Le Diamant Beauty Salon',
          short_name: 'M Le Diamant',
          description: 'Premium beauty salon in JBR Dubai - Manicure, Keratin, Spa & Beauty Services',
          theme_color: '#db2777',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: '/apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png'
            },
            {
              src: '/favicon.webp',
              sizes: '192x192',
              type: 'image/webp',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,webp,png,svg,jpg,jpeg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB для больших локализованных файлов
          // Disable runtime caching for API to prevent stale data issues on mobile
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            // NETWORK ONLY for API calls - NEVER CACHE
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\.(webp|png|jpg|jpeg|svg|gif)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                }
              }
            }
          ]
        }
      })])
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@beauty-crm/shared": path.resolve(__dirname, "../shared/src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: BACKEND_URL,
        changeOrigin: true,
        ws: true, // Enable WebSocket for /api/* endpoints (like /api/ws/notifications)
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Ignore noisy dev-time WS proxy errors (backend restart, dropped sockets)
            // ECONNRESET/EPIPE are expected when backend restarts while Vite is proxying WS.
            const anyErr = err as any;
            if (anyErr?.code === 'ECONNRESET' || anyErr?.code === 'EPIPE') {
              return;
            }
            if (err.message && err.message.includes('socket')) {
              return;
            }
            console.error('Proxy error:', err);
          });
        },
      },
      "/ws": {
        target: BACKEND_WS_URL,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Ignore noisy dev-time WS proxy errors (backend restart, dropped sockets)
            const anyErr = err as any;
            if (anyErr?.code === 'ECONNRESET' || anyErr?.code === 'EPIPE') {
              return;
            }
            if (err.message && err.message.includes('socket')) {
              return;
            }
            console.error('WebSocket proxy error:', err);
          });
        },
      },
      "/uploads": {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      "/static": {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    },
  },
  build: {
    // Оптимизация сборки
    outDir: "dist",
    emptyOutDir: true,

    // Минификация (esbuild быстрее и ест меньше памяти)
    minify: "esbuild",

    chunkSizeWarningLimit: 10000,

    // Не генерировать исходные карты для продакшена
    sourcemap: false,

    // Целевое окружение (современные браузеры)
    target: "esnext",

    // Опции терсера
    // Опции терсера (удалены для переключения на esbuild)
    // terserOptions removed

    // Оптимизация чанков
    rollupOptions: {
      // Несколько точек входа (multi-page app)
      input: {
        main: path.resolve(__dirname, "index.html"),
        landing: path.resolve(__dirname, "public_landing.html"),
      },
      output: {
        // Разделить vendor код на отдельные чанки (оптимизация для производительности)
        manualChunks: (id, { getModuleInfo }) => {
          // Переводы в отдельный чанк
          if (id.includes("/src/locales/")) {
            return "locales-data";
          }

          // Проверяем, используется ли модуль только в landing page
          const isLandingOnly = id.includes("/public_landing/");
          const isAdminPage = id.includes("/pages/admin/");
          const isCrmPage = id.includes("/pages/crm/");
          const isManagerPage = id.includes("/pages/manager/");

          // Не создавать admin chunks для landing page модулей
          if (isLandingOnly) {
            return undefined; // Пусть Vite сам решает
          }

          // Страницы в отдельные чанки для ленивой загрузки (только для main entry point)
          if (isAdminPage) {
            const match = id.match(/pages\/admin\/([^/.]+)/);
            if (match) return `admin-${match[1].toLowerCase()}`;
          }
          if (isCrmPage) return "crm-pages";
          if (isManagerPage) return "manager-pages";
          if (id.includes("/pages/public/")) return "public-pages";
        },
        chunkFileNames: "js/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});

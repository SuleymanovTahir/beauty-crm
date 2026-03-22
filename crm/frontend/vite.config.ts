import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { filterPreloadsPlugin } from "./vite-plugin-filter-preloads";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const backendPort = String(
    env.BACKEND_PORT || process.env.BACKEND_PORT || "8000",
  );
  const frontendPortRaw = String(
    env.FRONTEND_PORT || process.env.FRONTEND_PORT || "5173",
  );
  const parsedFrontendPort = Number(frontendPortRaw);
  const frontendPort = Number.isFinite(parsedFrontendPort) ? parsedFrontendPort : 5173;
  const appBasePath = mode === "production"
    ? String(env.APP_BASE_PATH || process.env.APP_BASE_PATH || "/crm/")
    : "/";

  const BACKEND_URL = `http://localhost:${backendPort}`;
  const BACKEND_WS_URL = `ws://localhost:${backendPort}`;

  return {
    base: appBasePath,
    plugins: [
      react(),
      filterPreloadsPlugin(),
      VitePWA({
          registerType: "autoUpdate",
          includeAssets: [],
          manifest: {
            name: "ST CRM",
            short_name: "ST CRM",
            description: "Universal CRM platform",
            theme_color: "#db2777",
            background_color: "#ffffff",
            display: "standalone"
          },
          workbox: {
            skipWaiting: true,
            clientsClaim: true,
            globPatterns: ["**/*.{js,css,html,webp,png,svg,jpg,jpeg,woff,woff2}"],
            maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB для больших локализованных файлов
            // Disable runtime caching for API to prevent stale data issues on mobile
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: "CacheFirst",
                options: {
                  cacheName: "google-fonts-cache",
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
                handler: "CacheFirst",
                options: {
                  cacheName: "gstatic-fonts-cache",
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
                handler: "NetworkOnly",
              }
            ]
          }
        })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@crm": path.resolve(__dirname, "./src"),
        "@radix-ui/react-collapsible": path.resolve(__dirname, "./src/lib/radix-collapsible-shim.tsx"),
      },
    },
    optimizeDeps: {
      include: [
        "@radix-ui/react-select",
      ],
    },
    server: {
      fs: {
        allow: [path.resolve(__dirname, "..")],
      },
      proxy: {
        "/api": {
          target: BACKEND_URL,
          changeOrigin: true,
          ws: true, // Enable WebSocket for /api/* endpoints (like /api/ws/notifications)
          configure: (proxy, _options) => {
            // Vite adds its own 'error' listener AFTER configure() returns,
            // so we defer with setImmediate to remove it only after it's been registered.
            setImmediate(() => {
              proxy.removeAllListeners('error');
              proxy.on('error', (err, _req, res) => {
                const anyErr = err as any;
                const DEV_CODES = ['ECONNRESET', 'EPIPE', 'ECONNREFUSED'];
                if (DEV_CODES.includes(anyErr?.code)) return;
                // AggregateError: each inner error has its own .code
                if (anyErr?.errors?.some((e: any) => DEV_CODES.includes(e.code))) return;
                if (err.message?.includes('socket')) return;
                console.error('Proxy error:', err);
                if (res && !(res as any).headersSent) {
                  (res as any).writeHead?.(503, { 'Content-Type': 'text/plain' });
                  (res as any).end?.('Backend unavailable');
                }
              });
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
      host: '0.0.0.0',
      port: frontendPort,
      strictPort: false, // Allow fallback to next port if 5173 is in use
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
        },
        output: {
          manualChunks: (id, { getModuleInfo }) => {
            if (id.includes("/src/locales/")) {
              return "locales-data";
            }
            void getModuleInfo;
            return undefined;
          },
          chunkFileNames: "js/[name]-[hash].js",
          entryFileNames: "js/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },
  };
});

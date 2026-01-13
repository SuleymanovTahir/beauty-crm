import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        ws: true, // Enable WebSocket for /api/* endpoints (like /api/ws/notifications)
      },
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
      "/uploads": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/static": {
        target: "http://localhost:8000",
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

    chunkSizeWarningLimit: 5000,

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
        manualChunks: (id) => {
          // Переводы в отдельный чанк
          if (id.includes("/src/locales/")) {
            return "locales-data";
          }

          // Страницы в отдельные чанки для ленивой загрузки
          if (id.includes("/pages/admin/")) {
            const match = id.match(/pages\/admin\/([^/.]+)/);
            if (match) return `admin-${match[1].toLowerCase()}`;
          }
          if (id.includes("/pages/crm/")) return "crm-pages";
          if (id.includes("/pages/manager/")) return "manager-pages";
          if (id.includes("/pages/public/")) return "public-pages";
        },
        chunkFileNames: "js/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});

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

    // Минификация (terser для лучшего результата)
    minify: "terser",

    chunkSizeWarningLimit: 5000,

    // Не генерировать исходные карты для продакшена
    sourcemap: false,

    // Целевое окружение (современные браузеры)
    target: "esnext",

    // Опции терсера
    terserOptions: {
      compress: {
        drop_console: true, // Удалить console.log в продакшене
      },
    },

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
          // Группируем крупные библиотеки отдельно
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) {
              return "react-vendor";
            }
            if (id.includes("recharts") || id.includes("d3")) {
              return "chart-vendor";
            }
            if (id.includes("react-hook-form")) {
              return "form-vendor";
            }
            if (id.includes("i18next") || id.includes("react-i18next")) {
              return "i18n-vendor";
            }
            if (id.includes("emoji-picker-react")) {
              return "emoji-picker-react.esm";
            }
            if (id.includes("@radix-ui")) {
              return "radix-vendor";
            }
            if (id.includes("framer-motion") || id.includes("motion")) {
              return "motion-vendor";
            }
            if (id.includes("sonner") || id.includes("vaul")) {
              return "ui-vendor";
            }
            // Остальные node_modules в общий vendor чанк
            return "vendor";
          }

          // Переводы в отдельный чанк, так как они весят 3.6МБ
          if (id.includes("/src/i18n.ts") || id.includes("/src/locales/")) {
            return "i18n-data";
          }

          // Административные страницы в отдельные чанки
          if (id.includes("/pages/admin/")) {
            const match = id.match(/pages\/admin\/([^/.]+)/);
            if (match) {
              return `admin-${match[1].toLowerCase()}`;
            }
          }
          // CRM страницы в отдельные чанки
          if (id.includes("/pages/crm/")) {
            return "crm-pages";
          }
          // Менеджерские страницы
          if (id.includes("/pages/manager/")) {
            return "manager-pages";
          }
          // Публичные страницы
          if (id.includes("/pages/public/")) {
            return "public-pages";
          }
        },
        chunkFileNames: "js/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});

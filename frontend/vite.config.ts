import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // ===== PLUGINS =====
  plugins: [react()],

  // ===== RESOLVE (Alias и расширения) =====
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "vaul@1.1.2": "vaul",
      "sonner@2.0.3": "sonner",
      "recharts@2.15.2": "recharts",
      "react-resizable-panels@2.1.7": "react-resizable-panels",
      "react-hook-form@7.55.0": "react-hook-form",
      "react-day-picker@8.10.1": "react-day-picker",
      "next-themes@0.4.6": "next-themes",
      "lucide-react@0.487.0": "lucide-react",
      "input-otp@1.4.2": "input-otp",
      "embla-carousel-react@8.6.0": "embla-carousel-react",
      "cmdk@1.1.1": "cmdk",
      "class-variance-authority@0.7.1": "class-variance-authority",
      "@radix-ui/react-tooltip@1.1.8": "@radix-ui/react-tooltip",
      "@radix-ui/react-toggle@1.1.2": "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group@1.1.2": "@radix-ui/react-toggle-group",
      "@radix-ui/react-tabs@1.1.3": "@radix-ui/react-tabs",
      "@radix-ui/react-switch@1.1.3": "@radix-ui/react-switch",
      "@radix-ui/react-slot@1.1.2": "@radix-ui/react-slot",
      "@radix-ui/react-slider@1.2.3": "@radix-ui/react-slider",
      "@radix-ui/react-separator@1.1.2": "@radix-ui/react-separator",
      "@radix-ui/react-select@2.1.6": "@radix-ui/react-select",
      "@radix-ui/react-scroll-area@1.2.3": "@radix-ui/react-scroll-area",
      "@radix-ui/react-radio-group@1.2.3": "@radix-ui/react-radio-group",
      "@radix-ui/react-progress@1.1.2": "@radix-ui/react-progress",
      "@radix-ui/react-popover@1.1.6": "@radix-ui/react-popover",
      "@radix-ui/react-navigation-menu@1.2.5":
        "@radix-ui/react-navigation-menu",
      "@radix-ui/react-menubar@1.1.6": "@radix-ui/react-menubar",
      "@radix-ui/react-label@2.1.2": "@radix-ui/react-label",
      "@radix-ui/react-hover-card@1.1.6": "@radix-ui/react-hover-card",
      "@radix-ui/react-dropdown-menu@2.1.6": "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-dialog@1.1.6": "@radix-ui/react-dialog",
      "@radix-ui/react-context-menu@2.2.6": "@radix-ui/react-context-menu",
      "@radix-ui/react-collapsible@1.1.3": "@radix-ui/react-collapsible",
      "@radix-ui/react-checkbox@1.1.4": "@radix-ui/react-checkbox",
      "@radix-ui/react-avatar@1.1.3": "@radix-ui/react-avatar",
      "@radix-ui/react-aspect-ratio@1.1.2": "@radix-ui/react-aspect-ratio",
      "@radix-ui/react-alert-dialog@1.1.6": "@radix-ui/react-alert-dialog",
      "@radix-ui/react-accordion@1.2.3": "@radix-ui/react-accordion",
    },
    extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
  },

  // ===== DEVELOPMENT SERVER =====
  server: {
    // Порт dev сервера
    port: 5173,

    // Автоматически открыть браузер
    open: false,

    // Proxy для API запросов (пересылаем на backend)
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        // Сохраняет /api в пути (не переписывает)
        rewrite: (path) => path,
      },
      "/webhook": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/static": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },

  // ===== BUILD КОНФИГ =====
  build: {
    // Выходная папка
    outDir: "dist",

    // Очистить перед сборкой
    emptyOutDir: true,

    // Минификация (terser для лучшего результата)
    minify: "terser",

    chunkSizeWarningLimit: 2000, 

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
      output: {
        // Разделить vendor код на отдельные чанки
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["lucide-react"],
          "chart-vendor": ["recharts"],
          "form-vendor": ["react-hook-form"],
        },
        // Именование файлов
        entryFileNames: "js/[name]-[hash].js",
        chunkFileNames: "js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];
          if (/png|jpe?g|gif|svg/.test(ext)) {
            return `images/[name]-[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/.test(ext)) {
            return `fonts/[name]-[hash][extname]`;
          } else if (ext === "css") {
            return `css/[name]-[hash][extname]`;
          }
          return `[name]-[hash][extname]`;
        },
      },
    },
  },

  // ===== PREVIEW (для локального тестирования production build) =====
  preview: {
    port: 4173,
    open: false,
  },

  // ===== ENVIRONMENT VARIABLES =====
  envPrefix: "VITE_",

  // ===== CSS КОНФИГ =====
  css: {
    // PostCSS опции (если есть tailwind)
    postcss: "./postcss.config.js",
  },

  // ===== ОПТИМИЗАЦИЯ ЗАВИСИМОСТЕЙ =====
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "lucide-react",
      "recharts",
      "next-themes",
      "sonner",
      "@radix-ui/react-slot",
      "class-variance-authority",
      "@radix-ui/react-accordion",
      "@radix-ui/react-select",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-label",
      "@radix-ui/react-tabs",
      "@radix-ui/react-switch",
      "@radix-ui/react-dialog",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-aspect-ratio",
      "@radix-ui/react-avatar",
    ],
  },
});

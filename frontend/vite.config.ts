import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  // ===== PROXY ДЛЯ DEVELOPMENT =====
  server: {
    port: 5173,
    proxy: {
      // Все запросы к /api перенаправляются на backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Сохраняет /api в пути
        rewrite: (path) => path,
      },
      // Webhook для тестирования
      '/webhook': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
    // Разрешить все хосты в dev
    middlewareMode: false,
  },

  // ===== BUILD КОНФИГ =====
  build: {
    // Папка для build
    outDir: 'dist',
    // Очистить перед сборкой
    emptyOutDir: true,
    // Не сжимать (опционально для дебага)
    minify: 'terser',
    // Исходные карты для production
    sourcemap: false,
    // Оптимизация чанков
    rollupOptions: {
      output: {
        manualChunks: {
          // Разделить vendor код
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react'],
          'chart-vendor': ['recharts'],
        }
      }
    }
  },

  // ===== ALIAS =====
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // ===== ENVIRONMENT VARIABLES =====
  envPrefix: 'VITE_',

  // ===== PREVIEW (для тестирования production build) =====
  preview: {
    port: 4173,
  },
})
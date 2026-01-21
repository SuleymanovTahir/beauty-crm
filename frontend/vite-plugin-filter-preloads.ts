import type { Plugin } from 'vite';

/**
 * Vite плагин для удаления admin preloads из landing page
 * Решает проблему render-blocking CSS от admin модулей на публичной странице
 */
export function filterPreloadsPlugin(): Plugin {
  return {
    name: 'filter-preloads',
    enforce: 'post',

    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        // Применяем только к landing page
        if (ctx.filename?.includes('public_landing.html')) {
          // Удаляем все admin preloads и stylesheets
          html = html.replace(
            /<link\s+rel="modulepreload"[^>]*href="[^"]*admin-[^"]*"[^>]*>\s*/g,
            ''
          );
          html = html.replace(
            /<link\s+rel="stylesheet"[^>]*href="[^"]*admin-[^"]*"[^>]*>\s*/g,
            ''
          );

          console.log('✅ Removed admin preloads from landing page');
        }

        return html;
      },
    },
  };
}

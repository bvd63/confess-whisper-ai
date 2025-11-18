import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import Inspect from 'vite-plugin-inspect';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    ...(mode === 'analyze' ? [Inspect()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'ConfessAI - Anonymous Confessions',
        short_name: 'ConfessAI',
        description: 'Share your thoughts anonymously, receive AI support, and connect with others in a safe space',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '192x192',
            type: 'image/x-icon'
          },
          {
            src: '/favicon.ico',
            sizes: '512x512',
            type: 'image/x-icon'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fxwvlbopvnjjjrzshqvw\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: mode === 'analyze',
    chunkSizeWarningLimit: mode === 'analyze' ? 1600 : 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('node_modules')) {
            if (normalizedId.includes('@supabase')) {
              return 'supabase';
            }
            if (normalizedId.includes('@tanstack/react-query')) {
              return 'react-query';
            }
            if (normalizedId.includes('recharts') || normalizedId.includes('/d3-')) {
              return 'charts-core';
            }
            if (normalizedId.includes('lucide-react') || normalizedId.includes('sonner')) {
              return 'ui-kit';
            }
          }

          if (normalizedId.includes('/src/lib/rechartsCartesianCore')) {
            return 'charts-cartesian-core';
          }

          if (normalizedId.includes('/src/lib/rechartsLine')) {
            return 'charts-line';
          }

          if (normalizedId.includes('/src/lib/rechartsBar')) {
            return 'charts-bar';
          }

          if (normalizedId.includes('/src/lib/rechartsPie')) {
            return 'charts-pie';
          }

          if (normalizedId.includes('/src/components/admin/') || normalizedId.includes('/src/pages/admin/')) {
            return 'admin-tools';
          }

          if (normalizedId.includes('/src/components/AdvancedAnalytics') || normalizedId.includes('/src/components/UserAnalytics')) {
            return 'analytics-suite';
          }

          if (normalizedId.includes('/src/i18n/lang/')) {
            const match = normalizedId.match(/lang\/([a-z-]+)/);
            if (match) {
              return `translations-${match[1]}`;
            }
            return 'translations';
          }

          if (
            normalizedId.includes('/src/lib/observability') ||
            normalizedId.includes('/src/lib/persistenceMonitor') ||
            normalizedId.includes('/src/lib/sentry')
          ) {
            return 'observability';
          }

          return undefined;
        },
      },
    },
  },
}));

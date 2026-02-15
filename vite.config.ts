import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import Inspect from 'vite-plugin-inspect';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 5173,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    ...(mode === 'analyze' ? [Inspect()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
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
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: [], // Disable all caching - always fetch fresh
        navigateFallbackDenylist: [/^\/version\.json/],
        cacheId: `confessai-${Date.now()}`,
        runtimeCaching: [] // Disable all runtime caching for instant updates
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

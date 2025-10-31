import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SubscriptionProvider } from "@/state/SubscriptionProvider";
import ErrorBoundary from "@/components/ErrorBoundaryFallback";
import { reportWebVitals } from "@/hooks/usePerformanceMonitor";
import { validateTranslationSystem } from "@/lib/i18nValidator";
import { prefetchCriticalRoutes } from "@/lib/bundleOptimization";
import { initOneSignal } from "@/notifications/initOneSignal";
import AppWrapper from "./components/AppWrapper.tsx";
import "./index.css";

// Initialize OneSignal (does not auto-prompt)
const hasOneSignal = !!import.meta.env.VITE_ONESIGNAL_APP_ID;
if (hasOneSignal) {
  window.addEventListener('load', () => {
    // Unregister any conflicting PWA service workers first
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          regs.forEach((reg) => {
            const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
            if (url.endsWith('/sw.js')) {
              console.info('[PWA] Unregistering /sw.js to allow OneSignal service worker');
              reg.unregister();
            }
          });
        })
        .catch(() => {});
    }
    
    // Initialize OneSignal
    initOneSignal().catch((err) => {
      console.error('[OneSignal] Failed to initialize:', err);
    });
  });
} else {
  // Register PWA service worker only if OneSignal is not enabled
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    });
  }
}

// Start Web Vitals monitoring in production
if (import.meta.env.PROD) {
  reportWebVitals();
}

// Validate translation system completeness in development
if (import.meta.env.DEV) {
  validateTranslationSystem();
}

// Prefetch critical routes for faster navigation
window.addEventListener('load', () => {
  prefetchCriticalRoutes();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <LanguageProvider>
            <SubscriptionProvider>
              <AppWrapper />
            </SubscriptionProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);

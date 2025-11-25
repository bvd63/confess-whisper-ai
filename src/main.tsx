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
import { initSentry } from "@/lib/sentry";
import { initOneSignal } from "@/lib/onesignal";
import { initPerformanceMonitoring } from "@/lib/performance";
import AppWrapper from "./components/AppWrapper.tsx";
import { env } from "@/lib/env";
import { configureLogger, logError } from "@/lib/logger";
import "./index.css";

configureLogger(env);

// Initialize Sentry error tracking
initSentry();

// Initialize performance monitoring (dev mode only)
initPerformanceMonitoring();

// Initialize OneSignal push notifications (browser-only)
if (typeof window !== 'undefined') {
  initOneSignal().catch(err => logError('OneSignal init failed', err as Error));
}

// Register service worker for PWA and force version check
if ('serviceWorker' in navigator && env.isProd) {
  window.addEventListener('load', () => {
    // Force unregister old service workers and register new one
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
      
      // Register new service worker after unregistering old ones
      setTimeout(() => {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
          logError('Service worker registration failed', error as Error);
        });
      }, 1000);
    });
  });
}

// Start Web Vitals monitoring in production
if (env.isProd) {
  reportWebVitals();
}

// Validate translation system completeness in development
if (env.isDev) {
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

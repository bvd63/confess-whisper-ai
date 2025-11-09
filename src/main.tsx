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
import AppWrapper from "./components/AppWrapper.tsx";
import { env } from "@/lib/env";
import "./index.css";

// Initialize Sentry error tracking
initSentry();

// Initialize OneSignal push notifications (browser-only)
if (typeof window !== 'undefined') {
  initOneSignal().catch(err => console.error('OneSignal init failed:', err));
}

// Register service worker for PWA
if ('serviceWorker' in navigator && env.isProd) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
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

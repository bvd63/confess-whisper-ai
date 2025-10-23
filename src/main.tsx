import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SubscriptionProvider } from "@/state/SubscriptionProvider";
import ErrorBoundary from "@/components/ErrorBoundaryFallback";
import { reportWebVitals } from "@/hooks/usePerformanceMonitor";
import { validateTranslationSystem } from "@/lib/i18nValidator";
import { validateEnvironment, renderEnvErrorScreen } from "@/lib/envValidator";
import App from "./App.tsx";
import "./index.css";

// Validate environment variables before app initialization
const envValidation = validateEnvironment();
if (!envValidation.valid) {
  const language = (localStorage.getItem('language') as 'en' | 'es' | 'de') || 'en';
  renderEnvErrorScreen(envValidation, language);
  throw new Error('Missing required environment variables');
}

// Register service worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}

// Start Web Vitals monitoring in production
if (import.meta.env.PROD) {
  reportWebVitals();
}

// Validate translation system completeness in development
if (import.meta.env.DEV) {
  validateTranslationSystem();
}

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
              <App />
            </SubscriptionProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);

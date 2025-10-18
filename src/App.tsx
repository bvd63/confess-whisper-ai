import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from 'next-themes';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from "./components/ErrorBoundary";
import { InstagramBottomNav } from "./components/InstagramBottomNav";
import { AnalyticsProvider } from "./components/AnalyticsProvider";
import { SystemNotifications } from '@/components/SystemNotifications';
import { PerformanceIndicator } from '@/components/PerformanceIndicator';
import { InstallPrompt } from '@/components/InstallPrompt';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';
import { useAuthRefresh } from '@/hooks/useAuthRefresh';
import { useSessionRestoration } from '@/hooks/useSessionRestoration';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { persistenceManager } from '@/lib/persistenceManager';
import { dataValidator } from '@/lib/dataValidator';
import { syncScheduler } from '@/lib/syncScheduler';
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Admin from "./pages/Admin";
import Bookmarks from "./pages/Bookmarks";
import Following from "./pages/Following";
import SearchUsers from "./pages/SearchUsers";
import Messages from "./pages/Messages";
import Explore from "./pages/Explore";
import Compose from "./pages/Compose";
import Communities from "./pages/Communities";
import CommunityDetail from "./pages/CommunityDetail";
import NearbyConfessions from "./pages/NearbyConfessions";
import Auth from "./pages/Auth";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useAuthRefresh(); // Auto JWT refresh
  useSessionRestoration(); // Auto session restoration
  useBackgroundSync(); // Background sync on focus
  
  // Clear cache on logout and run health checks
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        syncScheduler.stopPeriodicSync();
        await persistenceManager.clearAllUserData().catch(console.error);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Start periodic sync
        syncScheduler.startPeriodicSync(session.user.id);
        
        // Run data repair on login
        try {
          await dataValidator.repairData(session.user.id);
        } catch (error) {
          console.error('Data repair failed:', error);
        }
      }
    });

    // Start sync if already logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        syncScheduler.startPeriodicSync(user.id);
      }
    });

    // Clear expired cache weekly
    const clearExpired = () => {
      persistenceManager.clearExpiredData().catch(console.error);
    };
    clearExpired();
    const interval = setInterval(clearExpired, 7 * 24 * 60 * 60 * 1000);

    // Run cache health check daily
    const healthCheck = () => {
      dataValidator.checkCacheHealth().then(result => {
        if (!result.isValid) {
          console.error('❌ Cache health issues:', result.errors);
        }
        if (result.warnings.length > 0) {
          console.warn('⚠️ Cache warnings:', result.warnings);
        }
      });
    };
    healthCheck();
    const healthInterval = setInterval(healthCheck, 24 * 60 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      syncScheduler.stopPeriodicSync();
      clearInterval(interval);
      clearInterval(healthInterval);
    };
  }, []);
  
  return (
    <div className="relative pb-16">
      <NetworkStatusIndicator />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/compose" element={<Compose />} />
        <Route path="/communities" element={<Communities />} />
        <Route path="/community/:id" element={<CommunityDetail />} />
        <Route path="/nearby" element={<NearbyConfessions />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/u/:handle" element={<UserProfile />} />
        <Route path="/user/:userId" element={<UserProfile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/following" element={<Following />} />
        <Route path="/search-users" element={<SearchUsers />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-canceled" element={<PaymentCanceled />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <InstagramBottomNav />
    </div>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <AnalyticsProvider>
                <AppContent />
                <SystemNotifications />
                <PerformanceIndicator />
                <InstallPrompt />
              </AnalyticsProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </LanguageProvider>
  </ThemeProvider>
);

export default App;

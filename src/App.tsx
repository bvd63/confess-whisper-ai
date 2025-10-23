import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from 'next-themes';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { TabNavigationProvider } from '@/contexts/TabNavigationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from "./components/ErrorBoundary";
import { InstagramBottomNav } from "./components/InstagramBottomNav";
import { AnalyticsProvider } from "./components/AnalyticsProvider";
import { SystemNotifications } from '@/components/SystemNotifications';
import { PerformanceIndicator } from '@/components/PerformanceIndicator';
import { InstallPrompt } from '@/components/InstallPrompt';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';
import { useAuth } from '@/hooks/useAuth';
import { useAuthRefresh } from '@/hooks/useAuthRefresh';
import { useSessionRestoration } from '@/hooks/useSessionRestoration';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { useDeviceTracking } from '@/hooks/useDeviceTracking';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import { useSubscriptionConflictCheck } from '@/hooks/useSubscriptionConflictCheck';
import { useEffect, useState } from 'react';
import { getSupabase } from "./lib/supabaseClient";
import { persistenceManager } from '@/lib/persistenceManager';
import { dataValidator } from '@/lib/dataValidator';
import { syncScheduler } from '@/lib/syncScheduler';
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Admin from "./pages/Admin";
import SystemMonitor from "./pages/SystemMonitor";
import Bookmarks from "./pages/Bookmarks";
import Following from "./pages/Following";
import SearchUsers from "./pages/SearchUsers";
import Messages from "./pages/Messages";
import Explore from "./pages/Explore";
import Compose from "./pages/Compose";
import CommunityDetail from "./pages/CommunityDetail";
import NearbyConfessions from "./pages/NearbyConfessions";
import Auth from "./pages/Auth";
import AuthTest from "./pages/AuthTest";
import SupabaseTest from "./pages/SupabaseTest";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import EmailVerification from "./pages/EmailVerification";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import CoinPurchaseSuccess from "./pages/coins/Success";
import CoinPurchaseCancel from "./pages/coins/Cancel";
import TestPayments from "./pages/TestPayments";
import TestSubscriptions from "./pages/TestSubscriptions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";

const AppContent = () => {
  const { user } = useAuth();
  const [stayLoggedIn, setStayLoggedIn] = useState(() => {
    return localStorage.getItem('stay_logged_in') === 'true';
  });

  useAuthRefresh(); // Auto JWT refresh
  useSessionRestoration(); // Auto session restoration
  useBackgroundSync(); // Background sync on focus
  useDeviceTracking(); // Track device logins and notify
  useInactivityLogout({ 
    enabled: !stayLoggedIn, // Only auto-logout if user didn't check "stay logged in"
    inactivityTimeout: 30 * 60 * 1000, // 30 minutes
  });
  useSubscriptionConflictCheck(user?.id); // Check for subscription conflicts
  
  // Clear cache on logout and run health checks
  useEffect(() => {
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        syncScheduler.stopPeriodicSync();
        await persistenceManager.clearAllUserData().catch(console.error);
        localStorage.removeItem('stay_logged_in');
        setStayLoggedIn(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Check if user has stay_logged_in preference
        const userMeta = session.user.user_metadata;
        const staySignedIn = userMeta?.staySignedIn || false;
        localStorage.setItem('stay_logged_in', staySignedIn.toString());
        setStayLoggedIn(staySignedIn);
        
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
      <div data-testid="app-ready" style={{ display: 'none' }} />
      <NetworkStatusIndicator />
      <TabNavigationProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth-test" element={<AuthTest />} />
          <Route path="/supabase-test" element={<SupabaseTest />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/compose" element={<Compose />} />
          <Route path="/community/:id" element={<CommunityDetail />} />
          <Route path="/nearby" element={<NearbyConfessions />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/u/:handle" element={<UserProfile />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/system-monitor" element={<SystemMonitor />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/following" element={<Following />} />
          <Route path="/search-users" element={<SearchUsers />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-canceled" element={<PaymentCanceled />} />
          <Route path="/coins/success" element={<CoinPurchaseSuccess />} />
          <Route path="/coins/cancel" element={<CoinPurchaseCancel />} />
          <Route path="/test-payments" element={<TestPayments />} />
          <Route path="/test-subscriptions" element={<TestSubscriptions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <InstagramBottomNav />
      </TabNavigationProvider>
    </div>
  );
};

function App() {
  const { user, loading } = useAuth();

  // Location functionality removed - column doesn't exist in profiles table

  if (loading) {
    return null; // or a loading spinner
  }

  return (
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
  );
}

export default App;

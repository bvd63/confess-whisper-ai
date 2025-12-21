import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';
import { TabNavigationProvider } from '@/contexts/TabNavigationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from "./components/ErrorBoundary";
import { InstagramBottomNav } from "./components/InstagramBottomNav";
import { AnalyticsProvider } from "./components/AnalyticsProvider";
import { SystemNotifications } from '@/components/SystemNotifications';

import { InstallPrompt } from '@/components/InstallPrompt';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';
import { NotificationService } from '@/services/notificationService';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { VersionIndicator } from '@/components/VersionIndicator';
import { CheckoutStatusHandler } from '@/components/CheckoutStatusHandler';

import { useAuth } from '@/hooks/useAuth';
import { useAuthRefresh } from '@/hooks/useAuthRefresh';
import { useSessionRestoration } from '@/hooks/useSessionRestoration';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { useDeviceTracking } from '@/hooks/useDeviceTracking';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import { useSubscriptionConflictCheck } from '@/hooks/useSubscriptionConflictCheck';
import { useOneSignalInit } from '@/hooks/useOneSignalInit';
import { useEffect, useState, lazy, Suspense } from 'react';
import { getSupabase } from "./lib/supabaseClient";
import { persistenceManager } from '@/lib/persistenceManager';
import { dataValidator } from '@/lib/dataValidator';
import { syncScheduler } from '@/lib/syncScheduler';
import { Onboarding } from "./components/Onboarding";
import { VIPOnboardingModal } from "./components/onboarding/VIPOnboardingModal";
import { TrialBanner } from "./components/onboarding/TrialBanner";
import { useTrialStatus } from "./hooks/useTrialStatus";
import { useNavigate } from "react-router-dom";
import { PageLoading } from "./components/LoadingStates";
import { logError, logWarn } from '@/lib/logger';

// Lazy load all routes for code splitting
const Index = lazy(() => import("./pages/Index"));
const Profile = lazy(() => import("./pages/Profile"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Admin = lazy(() => import("./pages/Admin"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const Following = lazy(() => import("./pages/Following"));
const SearchUsers = lazy(() => import("./pages/SearchUsers"));
const Messages = lazy(() => import("./pages/Messages"));
const Explore = lazy(() => import("./pages/Explore"));
const Compose = lazy(() => import("./pages/Compose"));
const NearbyConfessions = lazy(() => import("./pages/NearbyConfessions"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const CoinPurchaseSuccess = lazy(() => import("./pages/coins/Success"));
const CoinPurchaseCancel = lazy(() => import("./pages/coins/Cancel"));
const ConfessionDetail = lazy(() => import("./pages/ConfessionDetail"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SettingsActivity = lazy(() => import("./pages/SettingsActivity"));
const Rewards = lazy(() => import("./pages/Rewards"));
const NotificationHistory = lazy(() => import("./pages/NotificationHistory"));
const AiSupport = lazy(() => import("./pages/AiSupport"));
const ContactSupport = lazy(() => import("./pages/ContactSupport"));

const AppContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stayLoggedIn, setStayLoggedIn] = useState(() => {
    return localStorage.getItem('stay_logged_in') === 'true';
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVIPOnboarding, setShowVIPOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const { trialStatus } = useTrialStatus();

  // Check if onboarding is needed
  useEffect(() => {
    const checkOnboarding = async () => {
      if (onboardingChecked) return;

      if (user) {
        setOnboardingChecked(true);
        return;
      }

      setOnboardingChecked(true);
    };
    
    checkOnboarding();
  }, [user, onboardingChecked]);

  useAuthRefresh(); // Auto JWT refresh
  useSessionRestoration(); // Auto session restoration
  useBackgroundSync(); // Background sync on focus
  useDeviceTracking(); // Track device logins and notify
  useInactivityLogout({ 
    enabled: !stayLoggedIn, // Only auto-logout if user didn't check "stay logged in"
    inactivityTimeout: 30 * 60 * 1000, // 30 minutes
  });
  useSubscriptionConflictCheck(user?.id); // Check for subscription conflicts
  useOneSignalInit(); // Initialize push notifications
  
  // Initialize NotificationService on mount
  useEffect(() => {
    if (user) {
      NotificationService.getInstance().initialize();
    }
  }, [user]);
  
  // Optimized: Clear cache on logout, aggressive cache clearing on mount, and run health checks
  useEffect(() => {
    const supabase = getSupabase();
    let dataRepairTimeout: NodeJS.Timeout;
    
    // AGGRESSIVE: Clear all old service worker caches on mount for fresh UI
    if ('caches' in window) {
      caches.keys().then((names) => {
        const now = Date.now();
        names.forEach((name) => {
          // Delete caches older than 1 hour
          if (name.includes('confessai-v') || name.includes('runtime-v')) {
            const match = name.match(/v(\d+)/);
            if (match) {
              const cacheTime = parseInt(match[1]);
              if (now - cacheTime > 60 * 60 * 1000) { // 1 hour
                caches.delete(name);
              }
            }
          }
        });
      }).catch(() => {});
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        syncScheduler.stopPeriodicSync();
        await persistenceManager.clearAllUserData().catch((err) => logError('Failed to clear user data', err instanceof Error ? err : undefined));
        localStorage.removeItem('stay_logged_in');
        setStayLoggedIn(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Check if user has stay_logged_in preference
        const userMeta = session.user.user_metadata;
        const staySignedIn = userMeta?.staySignedIn || false;
        localStorage.setItem('stay_logged_in', staySignedIn.toString());
        setStayLoggedIn(staySignedIn);
        
        // Start periodic sync (only once per auth change)
        syncScheduler.startPeriodicSync(session.user.id);
        
        // Debounced data repair - only run once after login settles
        clearTimeout(dataRepairTimeout);
        dataRepairTimeout = setTimeout(async () => {
          try {
            await dataValidator.repairData(session.user.id);
          } catch (error) {
            logError('Data repair failed', error instanceof Error ? error : undefined);
          }
        }, 2000); // Wait 2s after login
      }
    });

    // Clear expired cache weekly
    const clearExpired = () => {
      persistenceManager.clearExpiredData().catch((err) => logError('Failed to clear expired data', err instanceof Error ? err : undefined));
    };
    const clearInterval_1 = setInterval(clearExpired, 7 * 24 * 60 * 60 * 1000);

    // Run cache health check daily (skip initial check)
    const healthCheck = () => {
      dataValidator.checkCacheHealth().then(result => {
        if (!result.isValid) {
          logError('Cache health issues detected', undefined, { errors: result.errors });
        }
        if (result.warnings.length > 0) {
          logWarn('Cache warnings detected', { warnings: result.warnings });
        }
      });
    };
    const healthInterval = setInterval(healthCheck, 24 * 60 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      syncScheduler.stopPeriodicSync();
      clearInterval(clearInterval_1);
      clearInterval(healthInterval);
      clearTimeout(dataRepairTimeout);
    };
  }, []);
  
  return (
    <div className="relative pb-16">
      <div data-testid="app-ready" style={{ display: 'none' }} />
      
      
      {/* Trial banner */}
      {trialStatus.isActive && trialStatus.daysRemaining !== null && trialStatus.daysRemaining <= 3 && (
        <TrialBanner 
          daysRemaining={trialStatus.daysRemaining} 
          onUpgrade={() => navigate('/profile?section=subscription')}
        />
      )}
      
      {/* VIP Onboarding modal for new users */}
      {onboardingChecked && showVIPOnboarding && user && (
        <VIPOnboardingModal
          open={showVIPOnboarding}
          onOpenChange={setShowVIPOnboarding}
          onTrialActivated={() => {
            setShowVIPOnboarding(false);
          }}
        />
      )}
      
      {/* Regular onboarding overlay for users who skipped VIP trial */}
      {onboardingChecked && showOnboarding && user && (
        <Onboarding
          userId={user.id}
          onComplete={() => {
            setShowOnboarding(false);
            window.location.reload(); // Refresh to update coins & UI
          }}
        />
      )}
      
      <NetworkStatusIndicator />
      <CheckoutStatusHandler />
      <TabNavigationProvider>
        <Suspense fallback={<PageLoading className="min-h-[100dvh]" />}>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/update-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/compose" element={<Compose />} />
          <Route path="/nearby" element={<NearbyConfessions />} />
          <Route path="/confession/:id" element={<ConfessionDetail />} />
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
          <Route path="/coins/success" element={<CoinPurchaseSuccess />} />
          <Route path="/coins/cancel" element={<CoinPurchaseCancel />} />
          <Route path="/settings/activity" element={<SettingsActivity />} />
          <Route path="/settings/support/ai" element={<AiSupport />} />
          <Route path="/settings/support/contact" element={<ContactSupport />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/notifications" element={<NotificationHistory />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <InstagramBottomNav />
      </TabNavigationProvider>
    </div>
  );
};

function App() {
  const { user, loading } = useAuth();

  // Location functionality removed - column doesn't exist in profiles table

  if (loading) {
    return <div>Loading...</div>; // Show loading text instead of null
  }

  return (
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <ConfirmProvider>
          <AnalyticsProvider>
            <OfflineIndicator />
            <AppContent />
            <SystemNotifications />
            
            <InstallPrompt />
            <UpdatePrompt />
            <VersionIndicator />
          </AnalyticsProvider>
        </ConfirmProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
}

export default App;

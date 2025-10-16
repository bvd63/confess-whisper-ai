import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Clock, Filter } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/AppLayout";
import ConfessionFeed from "@/components/ConfessionFeed";
import ConfessionSkeleton from "@/components/ConfessionSkeleton";
import SocialProofStats from "@/components/SocialProofStats";
import FeatureHighlight from "@/components/FeatureHighlight";
import DailyPrompt from "@/components/DailyPrompt";
import Leaderboard from "@/components/Leaderboard";
import RecommendedConfessions from "@/components/RecommendedConfessions";
import SearchBar from "@/components/SearchBar";
import FollowStats from "@/components/FollowStats";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useConfessionInteractions } from "@/hooks/useConfessionInteractions";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import { useConfessions } from "@/hooks/useConfessions";
import { useConfessionSearch } from "@/hooks/useConfessionSearch";
import { useRateLimitHandler } from "@/components/RateLimitNotification";
import { useDebounce } from "@/hooks/useDebounce";
import SEOHead from "@/components/SEOHead";

// Lazy load heavy components
const NewConfessionDialog = lazy(() => import("@/components/NewConfessionDialog"));
const PremiumDialog = lazy(() => import("@/components/PremiumDialog"));
const OnboardingDialog = lazy(() => import("@/components/OnboardingDialog"));
const TrustBadges = lazy(() => import("@/components/TrustBadges"));
const FAQ = lazy(() => import("@/components/FAQ"));

const Index = () => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { isPremium } = usePremiumStatus(user?.id);
  useSubscriptionCheck(user?.id);
  const { likedConfessions, bookmarkedConfessions, reloadLikes, reloadBookmarks } = useConfessionInteractions({ userId: user?.id || null });
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [viewMode, setViewMode] = useState<'feed' | 'search'>('feed');
  const { toast } = useToast();
  const { RateLimitUI } = useRateLimitHandler();

  // Debounce filter changes to avoid excessive queries
  const debouncedSortBy = useDebounce(sortBy, 300);
  const debouncedCategoryFilter = useDebounce(categoryFilter, 300);

  // Use the optimized confessions hook with debounced values
  const { confessions, isLoading, reload: reloadConfessions } = useConfessions({
    sortBy: debouncedSortBy,
    categoryFilter: debouncedCategoryFilter,
    limit: 20,
  });

  // Search hook
  const { confessions: searchResults, loading: searchLoading, hasSearched, search, clear: clearSearch } = useConfessionSearch();

  useEffect(() => {
    // Track page view
    trackEvent('page_view', { page: 'index' });
    
    // Check if user is new (show onboarding)
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setTimeout(() => setShowOnboarding(true), 1000);
    }
    
    // Check for referral code
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem('referralCode', refCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewConfession = () => {
    if (!user) {
      navigate('/auth');
      toast({
        title: t.error_auth,
        description: t.error_auth,
      });
      return;
    }
    
    trackEvent('confession_create_clicked');
    setIsNewConfessionOpen(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: t.success_logout,
      description: t.success_logout,
    });
  };

  const handleReport = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('confessions')
        .update({ is_reported: true })
        .eq('id', id);

      if (error) throw error;

      trackEvent('confession_reported', { confession_id: id });

      toast({
        title: t.success_reported,
        description: t.success_reported,
      });
    } catch (error) {
      console.error('Error reporting confession:', error);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    }
  }, [trackEvent, toast, t]);

  const handleUpgradeToPremium = useCallback(async () => {
    toast({
      title: t.ui_upgrading,
      description: t.ui_payment_redirect,
    });
    
    setTimeout(async () => {
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('user_id', user.id);

        if (!error) {
          setIsPremiumDialogOpen(false);
          toast({
            title: t.ui_welcome_premium,
            description: t.ui_premium_access,
          });
        }
      }
    }, 1500);
  }, [user, toast, t]);

  return (
    <>
      <SEOHead />
      <AppLayout onNewConfession={handleNewConfession}>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">{t.anonymous_secure}</span>
          </div>
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {t.home_title}
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {t.welcome_description}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 animate-fade-in">
          <SearchBar 
            onSearch={(query, filters) => {
              setViewMode('search');
              search(query, filters);
            }}
          />
          {hasSearched && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setViewMode('feed');
                clearSearch();
              }}
              className="mt-2"
            >
              {t.index_back_to_feed}
            </Button>
          )}
        </div>

        {/* Daily Prompt */}
        {user && viewMode === 'feed' && <DailyPrompt onOpenNewConfession={handleNewConfession} />}

        {/* Follow Stats */}
        {user && viewMode === 'feed' && (
          <div className="mb-6">
            <FollowStats userId={user.id} />
          </div>
        )}

        {/* Social Proof Stats */}
        <SocialProofStats stats={{}} />

        {/* Leaderboard */}
        <div className="my-6">
          <Leaderboard />
        </div>

        {/* Feature Highlights */}
        <FeatureHighlight />

        {/* Recommended Confessions */}
        {user && (
          <div className="my-6">
            <RecommendedConfessions 
              userId={user.id} 
              currentCategory={categoryFilter !== 'all' ? categoryFilter : undefined}
            />
          </div>
        )}

        {/* Filters - Show only in feed mode */}
        {viewMode === 'feed' && confessions.length > 0 && (
          <div className="mb-6 space-y-4 animate-fade-in">
            {/* Category Filter */}
            <div className="flex items-center gap-3 justify-center">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px] border-primary/20 focus:border-primary/40 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all_categories}</SelectItem>
                  <SelectItem value="relationships">{t.category_relationships}</SelectItem>
                  <SelectItem value="work">{t.category_work}</SelectItem>
                  <SelectItem value="family">{t.category_family}</SelectItem>
                  <SelectItem value="health">{t.category_health}</SelectItem>
                  <SelectItem value="money">{t.category_money}</SelectItem>
                  <SelectItem value="other">{t.category_other}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Sort Tabs */}
            <div className="flex justify-center">
              <Tabs value={sortBy} onValueChange={(value) => setSortBy(value as 'recent' | 'popular')} className="w-full max-w-md">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                  <TabsTrigger value="recent" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t.ui_recent}
                  </TabsTrigger>
                  <TabsTrigger value="popular" className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {t.ui_popular}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        )}

        {/* Confessions Feed or Search Results */}
        <ConfessionFeed
          confessions={viewMode === 'search' ? searchResults : confessions}
          isLoading={viewMode === 'search' ? searchLoading : isLoading}
          isPremium={isPremium}
          likedConfessions={likedConfessions}
          bookmarkedConfessions={bookmarkedConfessions}
          onReport={handleReport}
          onUpgradeClick={() => setIsPremiumDialogOpen(true)}
          onInsightGenerated={reloadConfessions}
          onLikeChange={reloadLikes}
          onCommentChange={reloadConfessions}
          onBookmarkChange={reloadBookmarks}
          onNewConfession={handleNewConfession}
        />
      </main>

      {/* Dialogs with Suspense for lazy loading */}
      <Suspense fallback={null}>
        <NewConfessionDialog
          open={isNewConfessionOpen}
          onOpenChange={setIsNewConfessionOpen}
          onConfessionCreated={() => {
            reloadConfessions();
            trackEvent('confession_created');
          }}
        />

        <PremiumDialog
          open={isPremiumDialogOpen}
          onOpenChange={setIsPremiumDialogOpen}
          onUpgrade={handleUpgradeToPremium}
        />

        <OnboardingDialog
          open={showOnboarding}
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('hasSeenOnboarding', 'true');
          }}
        />
      </Suspense>
      
      {/* FAQ Section with Suspense */}
      <Suspense fallback={<ConfessionSkeleton />}>
        <div id="faq-section" className="mt-16">
          <FAQ />
        </div>
      </Suspense>

      {/* Footer with trust badges */}
      <Suspense fallback={null}>
        <footer className="mt-16">
          <TrustBadges />
        
        <div className="text-center py-6 border-t border-border/50">
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <button
              onClick={() => navigate('/privacy')}
              className="hover:text-primary transition-colors"
            >
              {t.privacy_policy}
            </button>
            <button
              onClick={() => navigate('/terms')}
              className="hover:text-primary transition-colors"
            >
              {t.terms_of_service}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            © 2025 {t.app_name}. {t.all_rights_reserved}
          </p>
        </div>
      </footer>
      </Suspense>
      
      {/* Rate Limit Notification */}
      {RateLimitUI}
      </AppLayout>
    </>
  );
};

export default Index;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, PlusCircle, LogOut, Sparkles, Crown, User, TrendingUp, Clock, LogIn } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import ConfessionCard from "@/components/ConfessionCard";
import NewConfessionDialog from "@/components/NewConfessionDialog";
import PremiumDialog from "@/components/PremiumDialog";
import OnboardingDialog from "@/components/OnboardingDialog";
import ConfessionSkeleton from "@/components/ConfessionSkeleton";
import SocialProofStats from "@/components/SocialProofStats";
import TrustBadges from "@/components/TrustBadges";
import FAQ from "@/components/FAQ";
import HelpButton from "@/components/HelpButton";
import FeatureHighlight from "@/components/FeatureHighlight";
import ThemeToggle from "@/components/ThemeToggle";
import EmptyState from "@/components/EmptyState";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";

interface Confession {
  id: string;
  content: string;
  ai_response?: string | null;
  ai_deep_insight?: string | null;
  created_at: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { t } = useLanguage();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    loadConfessions();
    
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
    
    // Set up real-time subscription
    const channel = supabase
      .channel('confessions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'confessions'
        },
        () => {
          // Reload confessions when new one is added
          loadConfessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (user) {
      checkPremiumStatus();
    }
  }, [user]);

  useEffect(() => {
    loadConfessions();
  }, [sortBy]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const checkPremiumStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setIsPremium(data?.is_premium || false);
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

  const loadConfessions = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('confessions')
        .select('*')
        .limit(20);

      // Sort based on selected filter
      if (sortBy === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('likes_count', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setConfessions(data || []);
    } catch (error) {
      console.error('Error loading confessions:', error);
      toast({
        title: t.error_generic,
        description: t.error_load,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    setUser(null);
    toast({
      title: t.success_logout,
      description: t.success_logout,
    });
  };

  const handleReport = async (id: string) => {
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
  };

  const handleUpgradeToPremium = async () => {
    // In a real app, this would integrate with Stripe
    toast({
      title: t.ui_upgrading,
      description: t.ui_payment_redirect,
    });
    
    // Demo: simulate upgrade
    setTimeout(async () => {
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('user_id', user.id);

        if (!error) {
          setIsPremium(true);
          setIsPremiumDialogOpen(false);
          toast({
            title: t.ui_welcome_premium,
            description: t.ui_premium_access,
          });
        }
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-[var(--shadow-soft)]">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" fill="currentColor" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {t.app_name}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            {user ? (
              <>
              {isPremium && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/30">
                    <Crown className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-primary">{t.premium_member}</span>
                  </div>
                )}
                <Button
                  onClick={handleNewConfession}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-[var(--shadow-soft)]"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {t.new_confession}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/profile')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <User className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                className="border-primary/30 hover:bg-primary/10"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {t.login}
              </Button>
            )}
          </div>
        </div>
      </header>

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

        {/* Social Proof Stats */}
        <SocialProofStats stats={{}} />

        {/* Feature Highlights */}
        <FeatureHighlight />

        {/* Filter Tabs */}
        {confessions.length > 0 && (
          <div className="flex justify-center mb-6 animate-fade-in">
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
        )}

        {/* Confessions Feed */}
        {isLoading ? (
          <div className="space-y-6">
            <ConfessionSkeleton />
            <ConfessionSkeleton />
            <ConfessionSkeleton />
          </div>
        ) : confessions.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No confessions yet"
            description="Be the first to share your thoughts. You'll instantly get an empathetic AI response."
            actionLabel={t.new_confession}
            onAction={handleNewConfession}
          />
        ) : (
          <div className="space-y-4">
            {confessions.map((confession) => (
              <ConfessionCard
                key={confession.id}
                confession={confession}
                isPremium={isPremium}
                onReport={handleReport}
                onUpgradeClick={() => setIsPremiumDialogOpen(true)}
                onInsightGenerated={loadConfessions}
              />
            ))}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <NewConfessionDialog
        open={isNewConfessionOpen}
        onOpenChange={setIsNewConfessionOpen}
        onConfessionCreated={() => {
          loadConfessions();
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
      
      {/* FAQ Section */}
      <div id="faq-section" className="mt-16">
        <FAQ />
      </div>

      {/* Footer with trust badges */}
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

      {/* Floating Help Button */}
      <HelpButton />
    </div>
  );
};

export default Index;

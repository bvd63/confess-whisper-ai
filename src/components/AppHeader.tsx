import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/EnhancedButton";

import { Heart, PlusCircle, LogOut, Crown, User, LogIn, BookMarked, Users, Home, Sparkles, Search, MessageCircle } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import CoinsDisplay from "@/components/CoinsDisplay";
import StreakCounter from "@/components/StreakCounter";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface AppHeaderProps {
  onNewConfession?: () => void;
  onUpgradeClick?: () => void;
  onManageSubscription?: () => void;
}
const AppHeader = ({
  onNewConfession,
  onUpgradeClick,
  onManageSubscription
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    t
  } = useLanguage();
  const {
    user
  } = useCurrentUser();
  const {
    isPremium,
    subscriptionTier
  } = usePremiumStatus(user?.id);
  const {
    toast
  } = useToast();
  const isMobile = useIsMobile();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
    toast({
      title: t.success_logout,
      description: t.success_logout
    });
  };
  const handleNewConfession = () => {
    if (!user) {
      navigate('/auth');
      toast({
        title: t.error_auth,
        description: t.error_auth
      });
      return;
    }
    if (onNewConfession) {
      onNewConfession();
    }
  };
  const isActive = (path: string) => location.pathname === path;
  return <header className="sticky top-0 z-50 glass-strong border-b border-border/50 shadow-elegant">
      {/* Unified Layout for All Screen Sizes */}
      <div className="w-full">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0 animate-heart-beat" fill="currentColor" />
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent cursor-pointer whitespace-nowrap" onClick={() => navigate('/')}>
              {t.app_name}
            </h1>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-1.5">
            <LanguageSelector />
            <ThemeToggle />
            {user ? <>
                {/* Always show subscription button - Upgrade for free, Manage for paid */}
                <Button 
                  onClick={() => {
                    if (subscriptionTier === 'free') {
                      onUpgradeClick?.();
                    } else {
                      onManageSubscription?.();
                    }
                  }} 
                  variant="outline" 
                  size="sm" 
                  className="border-primary/30 hover:bg-primary/10 h-8 px-2"
                >
                  <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                  <span className="hidden sm:inline text-xs ml-1">
                    {subscriptionTier === 'free' ? t.subscription_upgrade : t.subs_manage}
                  </span>
                </Button>
                <NotificationsDropdown />
                <Button onClick={handleSignOut} variant="outline" size="sm" className="border-primary/30 hover:bg-primary/10 h-8 px-2 sm:px-3">
                  <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline text-xs">{t.logout}</span>
                </Button>
              </> : <Button onClick={() => navigate('/auth')} variant="outline" size="sm" className="border-primary/30 hover:bg-primary/10 h-8 px-2 sm:px-3">
                <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5 sm:mr-1" />
                <span className="hidden sm:inline text-xs">{t.login}</span>
              </Button>}
          </div>
        </div>
      </div>
    </header>;
};
export default AppHeader;
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/EnhancedButton";

import { Heart, PlusCircle, LogOut, Crown, User, LogIn, BookMarked, Users, Home, Sparkles, Search, MessageCircle, Settings } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import CoinsDisplay from "@/components/CoinsDisplay";
import StreakCounter from "@/components/StreakCounter";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface AppHeaderProps {
  onNewConfession?: () => void;
  onManageSubscription?: (defaultTab?: 'subscriptions' | 'coins') => void;
}
const AppHeader = ({
  onNewConfession,
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
    subscriptionTier,
    subscriptionStatus
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
            {/* Settings Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              aria-label={t.settings}
              title={t.settings}
              onClick={() => navigate('/settings/activity')}
            >
              <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </Button>
            
            {user ? <>
                {/* Payment Failed Warning - Visible before opening dialog */}
                {subscriptionStatus === 'past_due' && (
                  <Badge variant="destructive" className="h-6 px-2 text-[10px] sm:text-xs animate-pulse">
                    Payment Failed - Update Required
                  </Badge>
                )}
                
                {/* Always show subscription button - Opens UnifiedShopDialog for subscriptions and coins */}
                <Button 
                  data-testid="manage-subscription-btn"
                  onClick={() => onManageSubscription?.()} 
                  variant={subscriptionTier === 'free' ? 'default' : 'outline'}
                  size="sm" 
                  className={cn(
                    "h-8 px-2 sm:px-3",
                    subscriptionTier === 'free' 
                      ? "bg-purple-600 hover:bg-purple-700 text-white" 
                      : "border-primary/30 hover:bg-primary/10"
                  )}
                >
                  <Crown className={cn(
                    "w-3 h-3 sm:w-3.5 sm:h-3.5",
                    subscriptionTier === 'free' && "text-white animate-pulse"
                  )} />
                  <span className="hidden sm:inline text-xs ml-1 font-semibold">
                    {subscriptionTier === 'free' ? 'Subscription & Coins' : 'Manage'}
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
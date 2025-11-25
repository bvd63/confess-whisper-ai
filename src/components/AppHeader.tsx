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
  return <header className="sticky top-0 z-50 glass-strong border-b border-border/50">
      {/* Unified Layout for All Screen Sizes */}
      <div className="w-full">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <Heart className="w-6 h-6 text-primary flex-shrink-0 animate-heart-beat" fill="currentColor" />
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent cursor-pointer whitespace-nowrap" onClick={() => navigate('/')}>
              {t.app_name}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {user ? <>
                {/* Payment Failed Warning */}
                {subscriptionStatus === 'past_due' && (
                  <Badge variant="destructive" className="h-7 px-3 text-xs animate-pulse">
                    Payment Failed
                  </Badge>
                )}
                
                {/* Subscription button */}
                <Button 
                  data-testid="manage-subscription-btn"
                  onClick={() => onManageSubscription?.()} 
                  variant={subscriptionTier === 'free' ? 'default' : 'outline'}
                  size="sm" 
                  className={cn(
                    "h-9 px-3 rounded-xl",
                    subscriptionTier === 'free' 
                      ? "bg-purple-600 hover:bg-purple-700 text-white" 
                      : "border-primary/30 hover:bg-primary/10"
                  )}
                >
                  <Crown className={cn(
                    "w-4 h-4",
                    subscriptionTier === 'free' && "text-white"
                  )} />
                  <span className="hidden sm:inline text-xs ml-1.5 font-semibold">
                    {subscriptionTier === 'free' ? 'Upgrade' : 'Manage'}
                  </span>
                </Button>
                <CoinsDisplay userId={user.id} variant="compact" />
                <NotificationsDropdown />
              </> : <Button onClick={() => navigate('/auth')} variant="outline" size="sm" className="border-primary/30 hover:bg-primary/10 h-9 px-4 rounded-xl">
                <LogIn className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline text-xs font-medium">{t.login}</span>
              </Button>}
          </div>
        </div>
      </div>
    </header>;
};
export default AppHeader;
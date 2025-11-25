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
  return <header className="sticky top-0 z-50 glass-strong border-b border-border/50 backdrop-blur-xl">
      <div className="w-full">
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-[#9C27FF] via-[#B266FF] to-[#8B20E7] flex items-center justify-center shadow-xl shadow-[#9C27FF]/30">
              <Heart className="w-6 h-6 text-white" fill="currentColor" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground cursor-pointer hover:text-[#9C27FF] dark:hover:text-[#B266FF] transition-colors" onClick={() => navigate('/')}>
              {t.app_name}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            {user ? <>
                {subscriptionStatus === 'past_due' && (
                  <Badge variant="destructive" className="h-9 px-4 text-xs font-semibold rounded-full animate-pulse shadow-lg">
                    Payment Failed
                  </Badge>
                )}
                
                <Button 
                  data-testid="manage-subscription-btn"
                  onClick={() => onManageSubscription?.()} 
                  variant={subscriptionTier === 'free' ? 'default' : 'outline'}
                  size="sm" 
                  className={cn(
                    "h-11 px-5 rounded-full font-semibold transition-all shadow-lg",
                    subscriptionTier === 'free' 
                      ? "bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] hover:from-[#FFE44D] hover:to-[#FFE44D] text-[#1A1A1F] dark:text-[#0B0B0F] shadow-[#FFD700]/30" 
                      : "border-border/50 bg-card hover:bg-muted shadow-sm"
                  )}
                >
                  <Crown className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm ml-2">
                    {subscriptionTier === 'free' ? 'Upgrade' : 'Manage'}
                  </span>
                </Button>
                <CoinsDisplay userId={user.id} variant="compact" />
                <NotificationsDropdown />
              </> : <Button onClick={() => navigate('/auth')} variant="outline" size="sm" className="h-11 px-5 rounded-full border-border/50 bg-card hover:bg-muted font-semibold shadow-sm">
                <LogIn className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline text-sm">{t.login}</span>
              </Button>}
          </div>
        </div>
      </div>
    </header>;
};
export default AppHeader;
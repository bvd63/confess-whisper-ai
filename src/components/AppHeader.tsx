import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/EnhancedButton";
import { AppLogo } from "@/components/AppLogo";

import { Heart, PlusCircle, LogOut, Crown, User, LogIn, BookMarked, Users, Home, Sparkles, Search, MessageCircle, Settings, ArrowLeft, Coins } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import CoinsDisplay from "@/components/CoinsDisplay";
import StreakCounter from "@/components/StreakCounter";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { Badge } from "@/components/ui/badge";
import { useCoins } from "@/hooks/useCoins";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface AppHeaderProps {
  onNewConfession?: () => void;
  onManageSubscription?: (defaultTab?: 'subscriptions' | 'coins') => void;
  hideOnScroll?: boolean;
  isVisible?: boolean;
}
const AppHeader = ({
  onNewConfession,
  onManageSubscription,
  hideOnScroll = false,
  isVisible = true
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
    isVip,
    subscriptionTier,
    subscriptionStatus
  } = useVipStatus(user?.id);
  const {
    toast
  } = useToast();
  const isMobile = useIsMobile();
  const { balance: coinBalance } = useCoins(user?.id || null);
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
  
  // Define back button navigation for sub-pages
  const getBackNavigation = (): { show: boolean; target: string } => {
    const path = location.pathname;
    
    // Settings -> Profile
    if (path === '/settings/activity') return { show: true, target: '/profile' };
    
    // Rewards -> Settings
    if (path === '/rewards') return { show: true, target: '/settings/activity' };
    
    // Privacy & Terms -> Settings
    if (path === '/privacy') return { show: true, target: '/settings/activity' };
    if (path === '/terms') return { show: true, target: '/settings/activity' };
    
    // Support pages -> Settings
    if (path.startsWith('/settings/support')) return { show: true, target: '/settings/activity' };
    
    return { show: false, target: '/' };
  };
  
  const backNav = getBackNavigation();
  
  return <header className={cn(
    "sticky top-0 z-50 px-4 sm:px-6 py-3 transition-all duration-300 ease-in-out",
    hideOnScroll && !isVisible && "transform -translate-y-full opacity-0 pointer-events-none"
  )}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6 rounded-full bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/95 to-[#0f1419]/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(139,92,246,0.15)]">
          {backNav.show && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(backNav.target)}
              className="h-9 w-9 rounded-xl hover:bg-white/10 absolute left-2"
            >
              <ArrowLeft className="h-4 w-4 text-white/70" />
            </Button>
          )}
          
          <h1 className={cn(
            "text-lg font-bold text-white cursor-pointer flex-1 text-center",
            backNav.show && "ml-8"
          )} onClick={() => navigate('/')}>
            <AppLogo />
          </h1>
          
          <div className="flex items-center gap-2">
            {user ? <>
                {subscriptionStatus === 'past_due' && (
                  <Badge variant="destructive" className="h-7 px-2 text-[10px] font-medium rounded-lg animate-pulse">
                    Failed
                  </Badge>
                )}
                
                <Button 
                  data-testid="manage-subscription-btn"
                  onClick={() => onManageSubscription?.()} 
                  variant="ghost"
                  size="sm" 
                  className="h-9 w-9 p-0 rounded-xl hover:bg-white/10 transition-all"
                >
                  <Crown className="w-4 h-4 text-amber-400" />
                </Button>
                
                <button
                  onClick={() => onManageSubscription?.('coins')}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm font-semibold text-white">{coinBalance ?? 0}</span>
                </button>
                
                <NotificationsDropdown />
              </> : <Button onClick={() => navigate('/auth')} variant="ghost" size="sm" className="h-9 px-3 rounded-xl hover:bg-white/10 font-medium text-white/90">
                <LogIn className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline text-xs">{t.login}</span>
              </Button>}
          </div>
        </div>
      </div>
    </header>;
};
export default AppHeader;
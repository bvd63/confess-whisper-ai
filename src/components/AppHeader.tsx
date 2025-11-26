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
  return <header className="sticky top-0 z-50 glass-strong border-b border-border">
      <div className="w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary via-primary-hover to-primary-pressed flex items-center justify-center shadow-lg shadow-primary/25">
              <Heart className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground cursor-pointer" onClick={() => navigate('/')}>
              {t.app_name}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? <>
                {subscriptionStatus === 'past_due' && (
                  <Badge variant="destructive" className="h-8 px-3 text-xs font-medium rounded-xl animate-pulse">
                    Payment Failed
                  </Badge>
                )}
                
                <Button 
                  data-testid="manage-subscription-btn"
                  onClick={() => onManageSubscription?.()} 
                  variant={subscriptionTier === 'free' ? 'default' : 'outline'}
                  size="sm" 
                  className={cn(
                    "h-10 px-4 rounded-2xl font-semibold transition-all",
                    subscriptionTier === 'free' 
                      ? "bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25" 
                      : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <Crown className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm ml-2">
                    {subscriptionTier === 'free' ? 'Upgrade' : 'Manage'}
                  </span>
                </Button>
                <CoinsDisplay userId={user.id} variant="compact" />
                <NotificationsDropdown />
              </> : <Button onClick={() => navigate('/auth')} variant="outline" size="sm" className="h-10 px-4 rounded-2xl border-border bg-card hover:bg-muted font-medium">
                <LogIn className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline text-sm">{t.login}</span>
              </Button>}
          </div>
        </div>
      </div>
    </header>;
};
export default AppHeader;
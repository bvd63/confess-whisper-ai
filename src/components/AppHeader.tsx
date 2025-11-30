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
import { useVipStatus } from "@/hooks/usePremiumStatus";
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
    isVip,
    subscriptionTier,
    subscriptionStatus
  } = useVipStatus(user?.id);
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
  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-900/90 via-purple-900/90 to-blue-900/90 backdrop-blur-xl border-b border-white/10">
      <div className="w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
          {/* Centered App Name */}
          <div className="flex-1" />
          <h1 className="text-xl sm:text-2xl font-bold text-white cursor-pointer tracking-tight" onClick={() => navigate('/')}>
            ConfessAI
          </h1>
          
          {/* Right: Coins (or Login) */}
          <div className="flex-1 flex items-center justify-end gap-2">
            {user ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <span className="text-xl">🪙</span>
                <span className="text-sm font-bold text-white">
                  <CoinsDisplay userId={user.id} variant="compact" />
                </span>
              </div>
            ) : (
              <Button onClick={() => navigate('/auth')} variant="ghost" size="sm" className="h-9 px-4 rounded-full text-white hover:bg-white/10 font-medium">
                <LogIn className="w-4 h-4 mr-2" />
                {t.login}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
export default AppHeader;
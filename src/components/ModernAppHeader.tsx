import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, LogIn, Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import CoinsDisplay from "@/components/CoinsDisplay";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { cn } from "@/lib/utils";

interface ModernAppHeaderProps {
  onNewConfession?: () => void;
  onManageSubscription?: (defaultTab?: 'subscriptions' | 'coins') => void;
}

/**
 * Modern Instagram/Facebook-style header
 * Clean, minimal, mobile-optimized
 */
const ModernAppHeader = ({
  onNewConfession,
  onManageSubscription
}: ModernAppHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { isPremium, subscriptionTier, subscriptionStatus } = usePremiumStatus(user?.id);
  const { toast } = useToast();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
    toast({
      title: t.success_logout,
      description: t.success_logout
    });
  };

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-border shadow-elegant">
      <div className="w-full">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 focus-ring rounded-lg px-2 -ml-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white text-lg font-bold">C</span>
            </div>
            <h1 className="text-xl font-bold gradient-text hidden sm:block">
              {t.app_name}
            </h1>
          </button>
          
          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Payment Failed Warning */}
                {subscriptionStatus === 'past_due' && (
                  <Badge 
                    variant="destructive" 
                    className="h-7 px-2 text-xs animate-pulse hidden sm:flex"
                  >
                    Payment Failed
                  </Badge>
                )}
                
                {/* VIP/Subscription Button */}
                <Button 
                  data-testid="manage-subscription-btn"
                  onClick={() => onManageSubscription?.()} 
                  variant={isPremium ? 'outline' : 'default'}
                  size="sm" 
                  className={cn(
                    "h-9 px-3 gap-1.5 focus-ring",
                    !isPremium && "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-md"
                  )}
                >
                  <Crown className={cn(
                    "w-4 h-4",
                    !isPremium && "animate-pulse"
                  )} />
                  <span className="hidden sm:inline text-xs font-semibold">
                    {isPremium ? 'VIP' : 'Go VIP'}
                  </span>
                </Button>

                {/* Coins Display */}
                <CoinsDisplay userId={user.id} variant="compact" />

                {/* Notifications */}
                <NotificationsDropdown />
              </>
            ) : (
              <Button 
                onClick={() => navigate('/auth')} 
                variant="outline" 
                size="sm" 
                className="h-9 px-4 gap-2 border-border hover:bg-accent focus-ring"
              >
                <LogIn className="w-4 h-4" />
                <span className="text-sm font-medium">{t.login}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ModernAppHeader;
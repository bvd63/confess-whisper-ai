import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, LogIn, Bell, Heart } from "lucide-react";
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
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-background/80 border-b border-border/50 shadow-ios">
      <div className="w-full">
      <div className="flex items-center justify-between px-5 py-4 max-w-7xl mx-auto">
        {/* Brand Section - Heart Icon + Confess Text */}
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 hover:scale-105 transition-transform"
        >
          <div className="p-2 bg-primary/10 rounded-2xl">
            <Heart className="w-5 h-5 text-primary" fill="currentColor" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Confess
          </span>
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
                    "h-10 px-4 gap-2 focus-ring rounded-full font-semibold shadow-ios",
                    !isPremium && "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  )}
                >
                  {isPremium ? (
                    <>
                      <Crown className="w-4 h-4" />
                      <span className="hidden sm:inline text-sm">VIP</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4 animate-pulse" />
                      <span className="text-sm">Subscription</span>
                    </>
                  )}
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
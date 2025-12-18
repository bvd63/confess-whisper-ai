import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Crown, LogIn, ArrowLeft, Coins } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { cn } from "@/lib/utils";
import { useCoins } from "@/hooks/useCoins";

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
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { subscriptionTier, subscriptionStatus } = useVipStatus(user?.id);
  const { balance, loading: coinsLoading } = useCoins(user?.id);
  
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
  
  return (
    <header className="sticky top-0 z-50">
      <div className="relative border-b border-white/10 bg-[#05060f]/90 shadow-lg shadow-black/20">
        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a0b40] via-[#0b0d1f] to-[#040308]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_55%)]" />
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {backNav.show ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(backNav.target)}
                  className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/15"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              ) : (
                <div className="h-12 w-12 rounded-3xl bg-gradient-to-br from-primary to-primary-pressed flex items-center justify-center shadow-xl shadow-primary/30">
                  <Heart className="h-6 w-6 text-white" />
                </div>
              )}

              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.4em] text-white/60">
                  {t.home_header_subtitle}
                </span>
                <button
                  onClick={() => navigate('/')}
                  className="text-left text-2xl font-semibold text-white sm:text-3xl"
                >
                  {t.home_header_title}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {user ? (
                <>
                  {subscriptionStatus === 'past_due' && (
                    <Badge variant="destructive" className="h-8 px-3 text-xs font-semibold rounded-full animate-pulse">
                      Payment Failed
                    </Badge>
                  )}

                  <button
                    onClick={() => onManageSubscription?.('coins')}
                    className="group flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 pl-4 text-white shadow-[0_12px_30px_rgba(5,6,15,0.45)] transition hover:border-white/40"
                    aria-label={t.coins_title ?? 'Coins'}
                  >
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-vip-gold" />
                      <span className="text-sm font-semibold">
                        {coinsLoading ? '—' : balance}
                      </span>
                    </div>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg font-bold leading-none">
                      +
                    </span>
                  </button>

                  <Button
                    data-testid="manage-subscription-btn"
                    onClick={() => onManageSubscription?.()}
                    size="sm"
                    className={cn(
                      "h-11 rounded-full px-4 font-semibold shadow-lg shadow-black/20",
                      subscriptionTier === 'free'
                        ? "bg-gradient-to-r from-primary to-primary-pressed text-white"
                        : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    <Crown className="h-4 w-4" />
                    <span className="ml-2 text-sm">
                      {subscriptionTier === 'free' ? t.vip_upgrade : t.subscription_manage ?? 'Manage'}
                    </span>
                  </Button>

                  <NotificationsDropdown />
                </>
              ) : (
                <Button
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  size="sm"
                  className="h-11 rounded-full border-white/30 bg-transparent px-4 text-white hover:bg-white/10"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {t.login}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
export default AppHeader;
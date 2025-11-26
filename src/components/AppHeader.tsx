import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

import { Heart, Crown, LogIn, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import CoinsDisplay from "@/components/CoinsDisplay";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  onNewConfession?: () => void;
  onManageSubscription?: (defaultTab?: 'subscriptions' | 'coins') => void;
}
const AppHeader = ({
  onNewConfession,
  onManageSubscription
}: AppHeaderProps) => {
  const navigate = useNavigate();
  const {
    t
  } = useLanguage();
  const {
    user
  } = useCurrentUser();
  const {
    subscriptionTier,
    subscriptionStatus
  } = usePremiumStatus(user?.id);

  const handleNewConfession = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (onNewConfession) {
      onNewConfession();
      return;
    }
    navigate('/compose');
  };
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-3 text-left"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-pressed shadow-lg shadow-primary/25">
            <Heart className="h-5 w-5 text-white" fill="currentColor" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">{t.app_name}</span>
            <span className="text-xs text-muted-foreground">{t.ui_safe_space}</span>
          </div>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {user ? (
            <>
              {subscriptionStatus === 'past_due' && (
                <Badge variant="destructive" className="h-8 rounded-xl px-3 text-xs font-semibold">
                  {t.subscription_status_past_due || t.subscription_payment_error}
                </Badge>
              )}
              {onNewConfession && (
                <Button
                  onClick={handleNewConfession}
                  size="sm"
                  variant="secondary"
                  className="h-10 rounded-2xl bg-card px-3 text-sm font-semibold text-foreground"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t.new_confession}</span>
                </Button>
              )}
              <Button
                data-testid="manage-subscription-btn"
                onClick={() => onManageSubscription?.()}
                variant={subscriptionTier === 'free' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "h-10 rounded-2xl px-4 font-semibold gap-2 text-sm",
                  subscriptionTier === 'free'
                    ? "shadow-lg shadow-primary/25"
                    : "border-border bg-card hover:bg-muted"
                )}
              >
                <Crown className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {subscriptionTier === 'free' ? t.upgrade_now : t.subscription_manage}
                </span>
              </Button>
              <CoinsDisplay userId={user.id} variant="compact" />
              <NotificationsDropdown />
            </>
          ) : (
            <Button
              onClick={() => navigate('/auth')}
              variant="outline"
              size="sm"
              className="h-10 rounded-2xl border-border bg-card px-4 font-medium"
            >
              <LogIn className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline text-sm">{t.login}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
export default AppHeader;
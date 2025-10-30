import { Home, Search, PlusSquare, MessageCircle, User, Users, Sparkles, Trophy } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTabNavigation } from "@/contexts/TabNavigationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { createPortal } from "react-dom";
import { useSubscription } from "@/state/SubscriptionProvider";
import { VIPBadge } from "./VIPBadge";
import { usePrefetch } from "@/hooks/usePrefetch";

/**
 * Instagram-style bottom navigation bar with independent tab stacks
 */
export const InstagramBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { switchTab, activeTab } = useTabNavigation();
  const { user } = useCurrentUser();
  const { totalUnread } = useUnreadCount(user?.id || null);
  const { t } = useLanguage();
  const { subscriptionTier } = useSubscription();
  const { prefetchPage } = usePrefetch();

  const isVIP = subscriptionTier === 'vip';

  const navItems = [
    { tabId: "home" as const, icon: Home, label: t.nav_home, isActive: activeTab === "home" },
    { tabId: "explore" as const, icon: Search, label: t.nav_explore, isActive: activeTab === "explore" },
    { tabId: "rewards" as const, icon: Trophy, label: "Rewards", isActive: location.pathname === "/rewards" },
    { tabId: "messages" as const, icon: MessageCircle, label: t.nav_messages, badge: totalUnread, isActive: activeTab === "messages" },
    { tabId: "profile" as const, icon: User, label: t.nav_profile, isActive: activeTab === "profile", showVIPBadge: isVIP },
  ];

  const handleTabClick = (tabId: "home" | "explore" | "messages" | "profile" | "compose" | "rewards") => {
    
    
    if (tabId === "compose") {
      // Compose is not a tab, navigate directly without switching tabs
      navigate("/compose");
      return;
    }
    
    if (tabId === "rewards") {
      // Rewards is not a tab, navigate directly without switching tabs
      navigate("/rewards");
      return;
    }
    
    // Special handling for home button when on compose/rewards route
    if (tabId === "home" && (location.pathname === "/compose" || location.pathname === "/rewards")) {
      navigate("/");
      return;
    }
    
    // Always switch tab immediately, even if in a conversation
    switchTab(tabId);
  };

  return (typeof document !== 'undefined'
    ? createPortal(
        <nav className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-auto glass-strong border-t border-border/50 safe-area-inset-bottom shadow-elegant">
          <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = item.isActive;

              return (
                <button
                  key={item.tabId}
                  type="button"
                  onClick={() => handleTabClick(item.tabId)}
                  onMouseEnter={() => prefetchPage(item.tabId)}
                  className={cn(
                    "relative flex flex-col items-center justify-center min-w-[56px] min-h-[56px] rounded-lg transition-all duration-200 animate-fade-in hover-scale touch-target",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  aria-label={item.label}
                >
                  <div className="relative">
                    <Icon
                      className={cn(
                        "w-6 h-6 transition-all duration-200",
                        active && "scale-110"
                      )}
                      strokeWidth={active ? 2.5 : 2}
                    />
                    {item.showVIPBadge && (
                      <div className="absolute -top-1 -right-1">
                        <div className="relative w-2.5 h-2.5 bg-purple-500 rounded-full">
                          <div className="absolute inset-0 w-2.5 h-2.5 bg-purple-400 rounded-full animate-ping" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {item.badge !== undefined && (
                    <span className={cn(
                      "absolute top-1 right-3 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold rounded-full shadow-elegant text-center",
                      item.badge > 0 
                        ? "text-white bg-destructive animate-pulse-glow" 
                        : "text-muted-foreground bg-muted"
                    )}>
                      {item.badge >= 10 ? "9+" : item.badge}
                    </span>
                  )}

                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-pulse-glow" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>,
        document.body
      )
    : null);

};

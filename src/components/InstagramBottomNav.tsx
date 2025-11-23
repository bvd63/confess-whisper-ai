import { Home, Search, PlusSquare, MessageCircle, User, Users, Sparkles } from "lucide-react";
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
import { useEffect, useRef, useCallback } from "react";

/**
 * Instagram-style bottom navigation bar with independent tab stacks
 * Fully keyboard accessible with ARIA support
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
  const navRef = useRef<HTMLDivElement>(null);

  const isVip = subscriptionTier === 'vip';

  const navItems = [
    { tabId: "home" as const, icon: Home, label: t.nav_home, isActive: activeTab === "home", shortcut: "1" },
    { tabId: "explore" as const, icon: Search, label: t.nav_explore, isActive: activeTab === "explore", shortcut: "2" },
    { tabId: "compose" as const, icon: PlusSquare, label: "Compose", isActive: location.pathname === "/compose", shortcut: "N" },
    { tabId: "messages" as const, icon: MessageCircle, label: t.nav_messages, badge: totalUnread, isActive: activeTab === "messages", shortcut: "3" },
    { tabId: "profile" as const, icon: User, label: t.nav_profile, isActive: activeTab === "profile", showVIPBadge: isVip, shortcut: "4" },
  ];

  const handleTabClick = useCallback((tabId: "home" | "explore" | "messages" | "profile" | "compose") => {
    if (tabId === "compose") {
      // Compose is not a tab, navigate directly without switching tabs
      navigate("/compose");
      return;
    }
    
    // Special handling for home button when on compose route
    if (tabId === "home" && location.pathname === "/compose") {
      navigate("/");
      return;
    }
    
    // Always switch tab immediately, even if in a conversation
    switchTab(tabId);
  }, [navigate, location.pathname, switchTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Alt + number for navigation
      if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        const shortcuts: Record<string, typeof navItems[number]['tabId']> = {
          '1': 'home',
          '2': 'explore',
          'N': 'compose',
          '3': 'messages',
          '4': 'profile',
        };
        
        const tabId = shortcuts[e.key.toUpperCase()];
        if (tabId) {
          e.preventDefault();
          handleTabClick(tabId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleTabClick]);

  const handleKeyDown = (e: React.KeyboardEvent, tabId: typeof navItems[number]['tabId'], index: number) => {
    const buttons = navRef.current?.querySelectorAll('button');
    if (!buttons) return;

    switch (e.key) {
      case 'ArrowLeft': {
        e.preventDefault();
        const prevButton = buttons[index - 1] as HTMLButtonElement;
        prevButton?.focus();
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        const nextButton = buttons[index + 1] as HTMLButtonElement;
        nextButton?.focus();
        break;
      }
      case 'Home':
        e.preventDefault();
        (buttons[0] as HTMLButtonElement)?.focus();
        break;
      case 'End':
        e.preventDefault();
        (buttons[buttons.length - 1] as HTMLButtonElement)?.focus();
        break;
    }
  };

  return (typeof document !== 'undefined'
    ? createPortal(
        <nav 
          role="navigation" 
          aria-label="Main navigation"
          className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-auto glass-strong border-t border-border/50 safe-area-inset-bottom shadow-elegant"
        >
          <div ref={navRef} className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-2" role="tablist">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = item.isActive;

              return (
                <button
                  key={item.tabId}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-current={active ? "page" : undefined}
                  aria-label={`${item.label} (Alt+${item.shortcut})`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => handleTabClick(item.tabId)}
                  onKeyDown={(e) => handleKeyDown(e, item.tabId, index)}
                  onMouseEnter={() => prefetchPage(item.tabId)}
                  className={cn(
                    "relative flex flex-col items-center justify-center min-w-[56px] min-h-[56px] rounded-lg transition-all duration-200 animate-fade-in hover-scale touch-target",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative">
                    <Icon
                      className={cn(
                        "w-6 h-6 transition-all duration-200",
                        active && "scale-110"
                      )}
                      strokeWidth={active ? 2.5 : 2}
                      aria-hidden="true"
                    />
                    {item.showVIPBadge && (
                      <div className="absolute -top-1 -right-1" aria-label="VIP member">
                        <div className="relative w-2.5 h-2.5 bg-purple-500 rounded-full">
                          <div className="absolute inset-0 w-2.5 h-2.5 bg-purple-400 rounded-full animate-ping" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {item.badge !== undefined && item.badge > 0 && (
                    <span 
                      className={cn(
                        "absolute top-1 right-3 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold rounded-full shadow-elegant text-center",
                        "text-white bg-destructive animate-pulse-glow"
                      )}
                      aria-label={`${item.badge} unread ${item.badge === 1 ? 'message' : 'messages'}`}
                      role="status"
                    >
                      {item.badge >= 10 ? "9+" : item.badge}
                    </span>
                  )}

                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-pulse-glow" aria-hidden="true" />
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

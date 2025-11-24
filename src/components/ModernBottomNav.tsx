import { Home, Search, PlusSquare, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTabNavigation } from "@/contexts/TabNavigationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { createPortal } from "react-dom";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useEffect, useCallback } from "react";

/**
 * Modern Instagram/Facebook-style bottom navigation
 * 5 tabs: Home, Search, Create, Messages, Profile
 * Mobile-first with purple accent
 */
export const ModernBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { switchTab, activeTab } = useTabNavigation();
  const { user } = useCurrentUser();
  const { totalUnread } = useUnreadCount(user?.id || null);
  const { t } = useLanguage();
  const { isPremium } = usePremiumStatus(user?.id);

  const navItems = [
    { 
      tabId: "home" as const, 
      icon: Home, 
      label: t.nav_home, 
      path: "/",
      isActive: activeTab === "home",
      shortcut: "1" 
    },
    { 
      tabId: "explore" as const, 
      icon: Search, 
      label: t.nav_explore, 
      path: "/explore",
      isActive: activeTab === "explore",
      shortcut: "2" 
    },
    { 
      tabId: "compose" as const, 
      icon: PlusSquare, 
      label: t.new_confession,
      path: "/compose",
      isActive: location.pathname === "/compose",
      shortcut: "N",
      isSpecial: true // Highlight the create button
    },
    { 
      tabId: "messages" as const, 
      icon: MessageCircle, 
      label: t.nav_messages,
      path: "/messages",
      badge: totalUnread,
      isActive: activeTab === "messages",
      shortcut: "3" 
    },
    { 
      tabId: "profile" as const, 
      icon: User, 
      label: t.nav_profile,
      path: "/profile",
      isActive: activeTab === "profile",
      showVIPIndicator: isPremium,
      shortcut: "4" 
    },
  ];

  const handleTabClick = useCallback((item: typeof navItems[number]) => {
    if (item.tabId === "compose") {
      navigate("/compose");
      return;
    }
    
    // Always switch tab immediately
    switchTab(item.tabId);
  }, [navigate, switchTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        const item = navItems.find(nav => nav.shortcut === e.key.toUpperCase());
        if (item) {
          e.preventDefault();
          handleTabClick(item);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleTabClick, navItems]);

  return (typeof document !== 'undefined'
    ? createPortal(
        <nav 
          role="navigation" 
          aria-label="Main navigation"
          className="fixed bottom-0 left-0 right-0 z-[9999] backdrop-blur-2xl bg-background/80 border-t border-border/50 safe-area-inset-bottom shadow-ios-lg"
        >
          <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-2">
            {navItems.map((item) => {
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
                  onClick={() => handleTabClick(item)}
                  className={cn(
                    "relative flex flex-col items-center justify-center min-w-[60px] h-14 rounded-2xl transition-all duration-300 touch-target focus-ring",
                    active
                      ? "text-primary opacity-100"
                      : "text-muted-foreground opacity-60 hover:text-foreground hover:opacity-90 hover:bg-accent/30 hover:scale-105",
                    item.isSpecial && "scale-110"
                  )}
                >
                  <div className="relative">
                    <Icon
                      className={cn(
                        "w-6 h-6 transition-all duration-300",
                        active && "scale-110",
                        item.isSpecial && "w-7 h-7"
                      )}
                      strokeWidth={active ? 2.5 : 2}
                      aria-hidden="true"
                    />
                    
                    {/* VIP Indicator */}
                    {item.showVIPIndicator && (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-purple-500 rounded-full ring-2 ring-background animate-pulse" />
                    )}
                    
                    {/* Unread Badge */}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span 
                        className={cn(
                          "absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full text-white bg-destructive animate-pulse"
                        )}
                        aria-label={`${item.badge} unread ${item.badge === 1 ? 'message' : 'messages'}`}
                      >
                        {item.badge >= 10 ? "9+" : item.badge}
                      </span>
                    )}
                  </div>

                  {/* Active Indicator Dot */}
                  {active && (
                    <span 
                      className="absolute bottom-2 w-1 h-1 bg-primary rounded-full animate-pulse" 
                      aria-hidden="true" 
                    />
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
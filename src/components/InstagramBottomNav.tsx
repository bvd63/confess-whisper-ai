import { Home, Search, Plus, MessageSquare, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTabNavigation } from "@/contexts/TabNavigationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { createPortal } from "react-dom";
import { usePrefetch } from "@/hooks/usePrefetch";
import { useEffect, useRef, useCallback } from "react";

/**
 * Bottom navigation bar matching the design reference
 * Fully keyboard accessible with ARIA support
 */
export const InstagramBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { switchTab, activeTab } = useTabNavigation();
  const { user } = useCurrentUser();
  const { totalUnread } = useUnreadCount(user?.id || null);
  const { t } = useLanguage();
  const { prefetchPage } = usePrefetch();
  const navRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { tabId: "home" as const, icon: Home, label: t.nav_home, isActive: activeTab === "home", shortcut: "1" },
    { tabId: "explore" as const, icon: Search, label: t.nav_explore, isActive: activeTab === "explore", shortcut: "2" },
    { tabId: "compose" as const, icon: Plus, label: "Create", isActive: location.pathname === "/compose", shortcut: "N", isCenter: true },
    { tabId: "messages" as const, icon: MessageSquare, label: t.nav_messages, badge: totalUnread, isActive: activeTab === "messages", shortcut: "3" },
    { tabId: "profile" as const, icon: User, label: t.nav_profile, isActive: activeTab === "profile", shortcut: "4" },
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
      case 'ArrowLeft':
        e.preventDefault();
        const prevButton = buttons[index - 1] as HTMLButtonElement;
        prevButton?.focus();
        break;
      case 'ArrowRight':
        e.preventDefault();
        const nextButton = buttons[index + 1] as HTMLButtonElement;
        nextButton?.focus();
        break;
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
          className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-auto pb-[env(safe-area-inset-bottom)]"
        >
          <div 
            ref={navRef} 
            className="flex items-center justify-around h-14 w-full px-4 bg-[#1a1a1f]/95 backdrop-blur-xl border-t border-white/10" 
            role="tablist"
          >
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = item.isActive;
              const isCenter = 'isCenter' in item && item.isCenter;

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
                    "relative flex items-center justify-center transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-0",
                    isCenter 
                      ? "w-10 h-10 rounded-full border-2 border-muted-foreground/30"
                      : "w-12 h-12 rounded-full",
                    active && !isCenter && "text-primary",
                    !active && !isCenter && "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "transition-all duration-200",
                      isCenter ? "w-5 h-5 text-muted-foreground" : "w-6 h-6",
                      active && !isCenter && "fill-primary"
                    )}
                    strokeWidth={active && !isCenter ? 2.5 : 1.5}
                    aria-hidden="true"
                  />
                  
                  {item.badge !== undefined && item.badge > 0 && (
                    <span 
                      className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full text-white bg-destructive"
                      aria-label={`${item.badge} unread ${item.badge === 1 ? 'message' : 'messages'}`}
                      role="status"
                    >
                      {item.badge >= 10 ? "9+" : item.badge}
                    </span>
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

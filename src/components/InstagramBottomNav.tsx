import { Home, Search, PlusSquare, MessageCircle, User, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTabNavigation } from "@/contexts/TabNavigationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { createPortal } from "react-dom";

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

  const navItems = [
    { tabId: "home" as const, icon: Home, label: t.nav_home, isActive: activeTab === "home" },
    { tabId: "explore" as const, icon: Search, label: t.nav_explore, isActive: activeTab === "explore" },
    { tabId: "compose" as const, icon: PlusSquare, label: "Compose", isActive: location.pathname === "/compose" },
    { tabId: "messages" as const, icon: MessageCircle, label: t.nav_messages, badge: totalUnread, isActive: activeTab === "messages" },
    { tabId: "profile" as const, icon: User, label: t.nav_profile, isActive: activeTab === "profile" },
  ];

  const handleTabClick = (tabId: "home" | "explore" | "messages" | "profile" | "compose") => {
    console.log('[BottomNav] Tab clicked:', tabId);
    
    if (tabId === "compose") {
      // Compose is not a tab, navigate directly without switching tabs
      navigate("/compose");
      return;
    }
    
    // Always switch tab immediately, even if in a conversation
    switchTab(tabId);
  };

  return (typeof document !== 'undefined'
    ? createPortal(
        <nav className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-auto glass-strong border-t border-border/50 safe-area-inset-bottom shadow-elegant">
          <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-4">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = item.isActive;

              return (
                <button
                  key={item.tabId}
                  type="button"
                  onClick={() => handleTabClick(item.tabId)}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-all duration-200 animate-fade-in hover-scale",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  aria-label={item.label}
                >
                  <Icon
                    className={cn(
                      "w-6 h-6 transition-all duration-200",
                      active && "scale-110"
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  
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

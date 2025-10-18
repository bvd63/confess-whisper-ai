import { Home, Search, PlusSquare, MessageCircle, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Instagram-style bottom navigation bar
 */
export const InstagramBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const { unreadCount } = useNotifications(user?.id || null);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: Home, path: "/", label: "Home" },
    { icon: Search, path: "/explore", label: "Explore" },
    { icon: PlusSquare, path: "/compose", label: "Compose" },
    { icon: MessageCircle, path: "/messages", label: "Messages", badge: unreadCount },
    { icon: User, path: "/profile", label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/50 safe-area-inset-bottom shadow-elegant">
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-4">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
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
              
              {item.badge && item.badge > 0 && (
                <span className="absolute top-1 right-3 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-destructive rounded-full animate-pulse-glow shadow-elegant">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}

              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full animate-pulse-glow" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

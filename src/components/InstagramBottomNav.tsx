import { Home, Search, Plus, MessageSquare, User, type LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTabNavigation, deriveTabFromPath, type TabId } from "@/contexts/TabNavigationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { createPortal } from "react-dom";
import { usePrefetch } from "@/hooks/usePrefetch";
import { useEffect, useRef, useCallback, useMemo, memo } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * Bottom navigation bar matching the design reference
 * Fully keyboard accessible with ARIA support
 */
type NavTarget = TabId | 'compose';

interface NavItem {
  tabId: NavTarget;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  shortcut: string;
  badge?: number;
}

interface NavButtonProps {
  icon: LucideIcon;
  active: boolean;
  badge?: number;
  ariaLabel: string;
  shortcut: string;
  tabIndex: number;
  onClick: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  onMouseEnter?: () => void;
}

const NavButton = memo(({
  icon: Icon,
  active,
  badge,
  ariaLabel,
  shortcut,
  tabIndex,
  onClick,
  onKeyDown,
  onMouseEnter,
}: NavButtonProps) => {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-current={active ? "page" : undefined}
      aria-label={`${ariaLabel} (Alt+${shortcut})`}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      className={cn(
        "relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-0",
        active ? "bg-white/10" : "hover:bg-white/5"
      )}
    >
      <Icon
        className={cn(
          "w-6 h-6 transition-all duration-200",
          active ? "text-white scale-110" : "text-white/50"
        )}
        strokeWidth={active ? 2 : 1.5}
        aria-hidden="true"
      />

      {badge !== undefined && badge > 0 && (
        <span 
          className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full text-white bg-gradient-to-br from-red-500 to-red-600 shadow-[0_4px_12px_rgba(239,68,68,0.4)] border border-red-400/20"
          aria-label={`${badge} unread ${badge === 1 ? 'message' : 'messages'}`}
          role="status"
        >
          {badge >= 10 ? "9+" : badge}
        </span>
      )}
    </button>
  );
});

NavButton.displayName = 'NavButton';

const KEYBOARD_SHORTCUTS: Record<string, NavTarget> = {
  '1': 'home',
  '2': 'explore',
  'N': 'compose',
  '3': 'messages',
  '4': 'profile',
};

export const InstagramBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { switchTab } = useTabNavigation();
  const { user } = useCurrentUser();
  const { totalUnread } = useUnreadCount(user?.id || null);
  const { t } = useLanguage();
  const { prefetchPage } = usePrefetch();
  const navRef = useRef<HTMLDivElement>(null);

  const derivedTab = useMemo(() => deriveTabFromPath(location.pathname), [location.pathname]);
  const isComposeActive = location.pathname.startsWith('/compose');

  const navItems = useMemo<NavItem[]>(() => [
    { tabId: 'home', icon: Home, label: t.nav_home, isActive: derivedTab === 'home', shortcut: '1' },
    { tabId: 'explore', icon: Search, label: t.nav_explore, isActive: derivedTab === 'explore', shortcut: '2' },
    { tabId: 'compose', icon: Plus, label: 'Create', isActive: isComposeActive, shortcut: 'N' },
    { tabId: 'messages', icon: MessageSquare, label: t.nav_messages, badge: totalUnread, isActive: derivedTab === 'messages', shortcut: '3' },
    { tabId: 'profile', icon: User, label: t.nav_profile, isActive: derivedTab === 'profile', shortcut: '4' },
  ], [derivedTab, isComposeActive, t, totalUnread]);

  const handleTabClick = useCallback((target: NavTarget) => {
    if (target === 'compose') {
      navigate('/compose');
      return;
    }

    if (target === 'home' && derivedTab === 'home' && !isComposeActive) {
      window.dispatchEvent(new CustomEvent('confessai:home-pressed', { detail: { source: 'bottom-nav' } }));
      return;
    }

    if (target === 'home' && isComposeActive) {
      navigate('/');
      return;
    }

    switchTab(target);
  }, [navigate, switchTab, isComposeActive, derivedTab]);

  const navClickHandlers = useMemo<Record<NavTarget, () => void>>(() => ({
    home: () => handleTabClick('home'),
    explore: () => handleTabClick('explore'),
    compose: () => handleTabClick('compose'),
    messages: () => handleTabClick('messages'),
    profile: () => handleTabClick('profile'),
  }), [handleTabClick]);

  const navPrefetchHandlers = useMemo<Record<NavTarget, () => void>>(() => ({
    home: () => prefetchPage('home'),
    explore: () => prefetchPage('explore'),
    compose: () => prefetchPage('compose'),
    messages: () => prefetchPage('messages'),
    profile: () => prefetchPage('profile'),
  }), [prefetchPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Alt + number for navigation
      if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        const tabId = KEYBOARD_SHORTCUTS[e.key.toUpperCase()];
        if (tabId) {
          e.preventDefault();
          handleTabClick(tabId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleTabClick]);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
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
          className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-auto"
        >
          <div 
            ref={navRef} 
            className="flex items-center justify-around min-h-16 w-full px-4 pb-[env(safe-area-inset-bottom)] bg-gradient-to-br from-[#1a1a2e]/95 via-[#16213e]/95 to-[#0f1419]/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.4)]" 
            role="tablist"
          >
            {navItems.map((item, index) => {
              return (
                <NavButton
                  key={item.tabId}
                  icon={item.icon}
                  active={item.isActive}
                  badge={item.badge}
                  ariaLabel={item.label}
                  shortcut={item.shortcut}
                  tabIndex={item.isActive ? 0 : -1}
                  onClick={navClickHandlers[item.tabId]}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  onMouseEnter={navPrefetchHandlers[item.tabId]}
                />
              );
            })}
          </div>
        </nav>,
        document.body
      )
    : null);

};

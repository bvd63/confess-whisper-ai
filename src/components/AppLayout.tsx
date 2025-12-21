import { ReactNode, useEffect, useState } from "react";
import AppHeader from "./AppHeader";

interface AppLayoutProps {
  children: ReactNode;
  onNewConfession?: () => void;
  onManageSubscription?: (defaultTab?: 'subscriptions' | 'coins') => void;
  hideHeaderOnScroll?: boolean;
  isHeaderVisible?: boolean;
  showHeader?: boolean;
}

const AppLayout = ({ children, onNewConfession, onManageSubscription, hideHeaderOnScroll, isHeaderVisible, showHeader = false }: AppLayoutProps) => {
  const [viewportHeaderVisible, setViewportHeaderVisible] = useState(true);

  // Global viewport scroll listener to mirror Instagram/Facebook header behavior
  useEffect(() => {
    if (!hideHeaderOnScroll) return;

    let lastY = window.pageYOffset;
    let ticking = false;

    const updateVisibility = () => {
      const currentY = window.pageYOffset;
      const delta = currentY - lastY;

      if (currentY < 12) {
        setViewportHeaderVisible(true);
        lastY = currentY;
        ticking = false;
        return;
      }

      if (Math.abs(delta) < 10) {
        ticking = false;
        return;
      }

      setViewportHeaderVisible(delta <= 0);
      lastY = currentY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateVisibility);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [hideHeaderOnScroll]);

  const computedHeaderVisible = hideHeaderOnScroll ? viewportHeaderVisible : (isHeaderVisible ?? true);
  return (
    <div
      className="relative min-h-[100dvh] bg-background"
    >
      {/* Base gradient layer */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background-secondary to-background pointer-events-none" />
      
      {/* Subtle premium radial glow overlay */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 100%, hsl(var(--primary) / 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 80%, hsl(var(--accent) / 0.05) 0%, transparent 50%)
          `
        }}
      />
      
      {/* Content layer */}
      <div
        data-app-scroll
        className="relative z-10 min-h-[100dvh] pb-[env(safe-area-inset-bottom)]"
      >
        {showHeader && (
          <AppHeader 
            onNewConfession={onNewConfession} 
            onManageSubscription={onManageSubscription}
            hideOnScroll={hideHeaderOnScroll}
            isVisible={computedHeaderVisible}
          />
        )}
        {children}
      </div>
    </div>
  );
};

export default AppLayout;

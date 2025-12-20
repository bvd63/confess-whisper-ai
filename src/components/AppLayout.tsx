import { ReactNode } from "react";
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
  return (
    <div
      className="relative min-h-[100dvh] bg-background overflow-hidden"
      style={{ overscrollBehaviorY: 'none' }}
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
        className="relative z-10 min-h-[100dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        {showHeader && (
          <AppHeader 
            onNewConfession={onNewConfession} 
            onManageSubscription={onManageSubscription}
            hideOnScroll={hideHeaderOnScroll}
            isVisible={isHeaderVisible}
          />
        )}
        {children}
      </div>
    </div>
  );
};

export default AppLayout;

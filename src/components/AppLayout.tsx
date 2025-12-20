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
    <div className="min-h-screen bg-gradient-to-br from-background via-background-secondary to-background">
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
  );
};

export default AppLayout;

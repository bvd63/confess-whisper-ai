import { ReactNode } from "react";
import AppHeader from "./AppHeader";

interface AppLayoutProps {
  children: ReactNode;
  onNewConfession?: () => void;
  onManageSubscription?: (defaultTab?: 'subscriptions' | 'coins') => void;
  hideHeaderOnScroll?: boolean;
  isHeaderVisible?: boolean;
}

const AppLayout = ({ children, onNewConfession, onManageSubscription, hideHeaderOnScroll, isHeaderVisible }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-secondary to-background">
      <AppHeader 
        onNewConfession={onNewConfession} 
        onManageSubscription={onManageSubscription}
        hideOnScroll={hideHeaderOnScroll}
        isVisible={isHeaderVisible}
      />
      {children}
    </div>
  );
};

export default AppLayout;

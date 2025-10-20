import { ReactNode } from "react";
import AppHeader from "./AppHeader";

interface AppLayoutProps {
  children: ReactNode;
  onNewConfession?: () => void;
  onUpgradeClick?: () => void;
  onManageSubscription?: () => void;
}

const AppLayout = ({ children, onNewConfession, onUpgradeClick, onManageSubscription }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <AppHeader onNewConfession={onNewConfession} onUpgradeClick={onUpgradeClick} onManageSubscription={onManageSubscription} />
      {children}
    </div>
  );
};

export default AppLayout;

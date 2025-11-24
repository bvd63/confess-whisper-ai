import { ReactNode } from "react";
import ModernAppHeader from "./ModernAppHeader";

interface AppLayoutProps {
  children: ReactNode;
  onNewConfession?: () => void;
  onManageSubscription?: (defaultTab?: 'subscriptions' | 'coins') => void;
}

const AppLayout = ({ children, onNewConfession, onManageSubscription }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <ModernAppHeader onNewConfession={onNewConfession} onManageSubscription={onManageSubscription} />
      {children}
    </div>
  );
};

export default AppLayout;

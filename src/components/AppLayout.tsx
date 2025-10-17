import { ReactNode } from "react";
import AppHeader from "./AppHeader";

interface AppLayoutProps {
  children: ReactNode;
  onNewConfession?: () => void;
  onUpgradeClick?: () => void;
}

const AppLayout = ({ children, onNewConfession, onUpgradeClick }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <AppHeader onNewConfession={onNewConfession} onUpgradeClick={onUpgradeClick} />
      {children}
    </div>
  );
};

export default AppLayout;

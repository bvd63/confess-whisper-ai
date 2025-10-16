import { ReactNode } from "react";
import AppHeader from "./AppHeader";

interface AppLayoutProps {
  children: ReactNode;
  onNewConfession?: () => void;
}

const AppLayout = ({ children, onNewConfession }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <AppHeader onNewConfession={onNewConfession} />
      {children}
    </div>
  );
};

export default AppLayout;

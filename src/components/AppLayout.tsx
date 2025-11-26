import { ReactNode } from "react";
import AppHeader from "./AppHeader";

interface AppLayoutProps {
  children: ReactNode;
  onNewConfession?: () => void;
  onManageSubscription?: (defaultTab?: 'subscriptions' | 'coins') => void;
}

const AppLayout = ({ children, onNewConfession, onManageSubscription }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader onNewConfession={onNewConfession} onManageSubscription={onManageSubscription} />
      <main className="w-full max-w-5xl mx-auto px-4 pb-28 pt-4">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;

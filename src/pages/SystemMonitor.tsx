import { PersistenceMonitorDashboard } from '@/components/PersistenceMonitorDashboard';
import { CoinSystemTest } from '@/components/CoinSystemTest';
import AppLayout from '@/components/AppLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedShopDialog } from '@/components/UnifiedShopDialog';
import { useState } from 'react';

const SystemMonitor = () => {
  const { user, isLoading: userLoading } = useCurrentUser();
  const { isAdmin, loading: roleLoading } = useUserRole(user?.id || '');
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);

  if (userLoading || roleLoading) {
    return (
      <>
      <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
        <div className="container mx-auto p-6">
          <div className="text-center">Loading...</div>
        </div>
      </AppLayout>
      <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
      </>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (!isAdmin) {
    return (
      <>
      <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Admin access required to view system monitoring dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
      <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
      </>
    );
  }

  return (
    <>
    <AppLayout onManageSubscription={() => setManageSubDialogOpen(true)}>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">System Monitor</h1>
        <Tabs defaultValue="persistence" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="persistence">Persistence</TabsTrigger>
            <TabsTrigger value="coins">Coin System</TabsTrigger>
          </TabsList>
          <TabsContent value="persistence" className="mt-6">
            <PersistenceMonitorDashboard />
          </TabsContent>
          <TabsContent value="coins" className="mt-6">
            <CoinSystemTest />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
    <UnifiedShopDialog open={manageSubDialogOpen} onOpenChange={setManageSubDialogOpen} />
    </>
  );
};

export default SystemMonitor;

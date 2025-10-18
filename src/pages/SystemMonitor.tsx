import { PersistenceMonitorDashboard } from '@/components/PersistenceMonitorDashboard';
import AppLayout from '@/components/AppLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

const SystemMonitor = () => {
  const { user, isLoading: userLoading } = useCurrentUser();
  const { isAdmin, loading: roleLoading } = useUserRole(user?.id || '');

  if (userLoading || roleLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Admin access required to view system monitoring dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PersistenceMonitorDashboard />
    </AppLayout>
  );
};

export default SystemMonitor;

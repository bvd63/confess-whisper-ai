import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { logError } from "@/lib/logger";

export const SyncSubscriptionButton = ({ onSyncComplete }: { onSyncComplete?: () => void }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-subscription-sync');
      
      if (error) throw error;

      if (data?.success) {
        toast.success(`✅ Subscription synced: ${data.tier.toUpperCase()}`, {
          description: data.message,
          duration: 5000,
        });
        
        // Trigger page refresh
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        
        onSyncComplete?.();
      } else {
        throw new Error(data?.error || 'Sync failed');
      }
    } catch (error: any) {
      logError('Sync error', error);
      toast.error('Failed to sync subscription', {
        description: error.message || 'Please try again or contact support',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Syncing...' : 'Sync Subscription'}
    </Button>
  );
};

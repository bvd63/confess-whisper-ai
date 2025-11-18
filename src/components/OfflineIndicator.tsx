import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/**
 * Shows a banner when user is offline
 */
export const OfflineIndicator = () => {
  const { t } = useLanguage();
  const { isOnline, queuedOperations, pendingByScope } = useNetworkStatus();

  if (isOnline && queuedOperations === 0) {
    return null;
  }

  const scopeBreakdown = Object.entries(pendingByScope)
    .filter(([, count]) => count > 0)
    .map(([scope, count]) => `${scope}: ${count}`)
    .join(' • ');

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        isOnline ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground",
        "py-2 px-4",
        "animate-slide-down",
        "shadow-lg"
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="container mx-auto flex flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <p className="text-sm font-medium">
            {isOnline
              ? t.network_syncing?.replace('{count}', String(queuedOperations)) || `Syncing ${queuedOperations} pending operation(s)...`
              : t.offline_mode || 'Offline Mode'}
          </p>
        </div>
        {!isOnline && (
          <p className="text-xs opacity-80">
            {t.offline_message || "You're offline. Content will sync when connected."}
          </p>
        )}
        {isOnline && scopeBreakdown && (
          <p className="text-xs opacity-80">
            {scopeBreakdown}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Notification Status Badge Component
 * Shows current notification permission status with visual indicator
 */

import { Bell, BellOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { getNotificationPermission } from "@/services/onesignal";

interface NotificationStatusBadgeProps {
  className?: string;
}

export const NotificationStatusBadge = ({ className }: NotificationStatusBadgeProps) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const checkPermission = () => {
      setPermission(getNotificationPermission());
    };

    checkPermission();
    
    // Check permission status every 5 seconds
    const interval = setInterval(checkPermission, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusInfo = () => {
    switch (permission) {
      case 'granted':
        return {
          icon: Bell,
          text: 'Active',
          variant: 'default' as const,
          className: 'bg-green-500/20 text-green-400 border-green-500/30'
        };
      case 'denied':
        return {
          icon: BellOff,
          text: 'Blocked',
          variant: 'destructive' as const,
          className: 'bg-red-500/20 text-red-400 border-red-500/30'
        };
      default:
        return {
          icon: Bell,
          text: 'Disabled',
          variant: 'outline' as const,
          className: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        };
    }
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  return (
    <Badge 
      variant={status.variant} 
      className={`flex items-center gap-1.5 ${status.className} ${className}`}
    >
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium">{status.text}</span>
    </Badge>
  );
};

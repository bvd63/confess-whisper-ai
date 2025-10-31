import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { 
  initOneSignal, 
  requestPushPermission, 
  isPushEnabled, 
  disablePush,
  sendTestNotification 
} from '@/services/push/oneSignalClient';
import { notify } from '@/lib/notifications';

export const PushNotificationSettings = () => {
  const { t, language } = useLanguage();
  const { user } = useCurrentUser();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    checkPushStatus();
  }, [user]);

  const checkPushStatus = async () => {
    if (!user) return;
    
    const enabled = await isPushEnabled();
    setPushEnabled(enabled);
    setPermissionStatus(Notification.permission);
  };

  const handleTogglePush = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      if (pushEnabled) {
        // Disable push
        await disablePush(user.id);
        setPushEnabled(false);
        notify.info('notifications.pushDisabled', language);
      } else {
        // Request permission and enable
        const granted = await requestPushPermission();
        
        if (granted) {
          await initOneSignal(user.id);
          setPushEnabled(true);
          notify.success('notifications.pushEnabled', language);
        } else {
          notify.error('notifications.pushBlocked', language);
        }
      }
      
      setPermissionStatus(Notification.permission);
    } catch (error) {
      console.error('Error toggling push:', error);
      notify.error('notifications.operationFailed', language);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const success = await sendTestNotification(user.id);
      
      if (success) {
        notify.success('notifications.testSent', language);
      } else {
        notify.error('notifications.testFailed', language);
      }
    } catch (error) {
      console.error('Error sending test:', error);
      notify.error('notifications.operationFailed', language);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {t.notifications_push_title}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t.notifications_push_description}
          </p>
        </div>
        <Switch
          checked={pushEnabled}
          onCheckedChange={handleTogglePush}
          disabled={isLoading || permissionStatus === 'denied'}
        />
      </div>

      {/* Permission Status */}
      <div className="flex items-center gap-2 text-sm">
        {permissionStatus === 'granted' ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-green-600">{t.notifications_push_enabled}</span>
          </>
        ) : permissionStatus === 'denied' ? (
          <>
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="text-destructive">{t.notifications_push_blocked}</span>
          </>
        ) : (
          <>
            <BellOff className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t.notifications_push_not_enabled}</span>
          </>
        )}
      </div>

      {/* Test Notification Button */}
      {pushEnabled && (
        <Button
          onClick={handleTestNotification}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {t.notifications_send_test}
        </Button>
      )}

      {/* Help Text for Blocked */}
      {permissionStatus === 'denied' && (
        <p className="text-xs text-muted-foreground">
          {t.notifications_push_blocked_help}
        </p>
      )}
    </div>
  );
};

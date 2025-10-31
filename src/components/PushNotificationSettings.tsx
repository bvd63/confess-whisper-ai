import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { 
  initOneSignal, 
  requestPushPermission, 
  isPushEnabled, 
  getPushStatus,
  disablePush,
  sendTestNotification 
} from '@/services/push/oneSignalClient';
import { notify } from '@/lib/notifications';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';

export const PushNotificationSettings = () => {
  const { t, language } = useLanguage();
  const { user } = useCurrentUser();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [optedIn, setOptedIn] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [streakAlerts, setStreakAlerts] = useState(true);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    checkPushStatus();
    loadNotificationSettings();
  }, [user]);

  const checkPushStatus = async () => {
    if (!user) return;
    
    const status = await getPushStatus();
    setPushEnabled(status.isEnabled);
    setPermissionStatus(status.permission);
    setOptedIn(status.optedIn);
    setPlayerId(status.playerId);
  };

  const loadNotificationSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notification_settings')
      .select('daily_reminder, streak_alerts')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setDailyReminder(data.daily_reminder ?? true);
      setStreakAlerts(data.streak_alerts ?? true);
    }
  };

  const updateNotificationSettings = async (field: 'daily_reminder' | 'streak_alerts', value: boolean) => {
    if (!user) return;

    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: user.id,
        [field]: value,
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Failed to update notification settings:', error);
      notify.error('notifications.operationFailed', language);
    } else {
      notify.success('settings.saved', language);
    }
  };

  const handleTogglePush = async () => {
    if (!user) return;

    // Show a clear message if configuration is missing
    if (!import.meta.env.VITE_ONESIGNAL_APP_ID) {
      notify.custom('Configurație lipsă: OneSignal App ID. Te rugăm contactează suportul sau adaugă cheia în setările proiectului.', 'destructive');
      return;
    }

    console.log('[PushSettings] Toggle clicked', { currentEnabled: pushEnabled, permission: Notification.permission });
    setIsLoading(true);
    try {
      if (pushEnabled) {
        // Disable push
        await disablePush(user.id);
        setPushEnabled(false);
        console.log('[PushSettings] Disabled push successfully');
        notify.info('notifications.pushDisabled', language);
      } else {
        // Request permission and enable
        const granted = await requestPushPermission();
        console.log('[PushSettings] Permission flow result', { granted });
        
        if (granted) {
          await initOneSignal(user.id);
          // Re-check state from SDK
          const status = await getPushStatus();
          setPushEnabled(status.isEnabled);
          setPermissionStatus(status.permission);
          setOptedIn(status.optedIn);
          setPlayerId(status.playerId);
          setShowRetry(false);
          console.log('[PushSettings] Enabled state after init', status);
          
          if (status.isEnabled) {
            notify.success('notifications.pushEnabled', language);
          } else {
            // Permission granted but subscription failed
            setShowRetry(true);
            notify.custom('Permisiunea a fost acordată, dar abonarea nu s-a finalizat. Te rugăm să încerci din nou.', 'default');
          }
        } else {
          notify.error('notifications.pushBlocked', language);
          setShowRetry(false);
        }
      }
      setPermissionStatus(Notification.permission);
    } catch (error) {
      console.error('Error toggling push:', error);
      notify.error('notifications.operationFailed', language);
    } finally {
      setIsLoading(false);
      // final consistency check
      checkPushStatus();
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
          onCheckedChange={() => handleTogglePush()}
          disabled={isLoading}
        />
      </div>

      {/* Permission Status */}
      <div className="flex items-center gap-2 text-sm">
        {permissionStatus === 'default' && (
          <>
            <BellOff className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t.notifications_push_off}</span>
          </>
        )}
        {permissionStatus === 'denied' && (
          <>
            <XCircle className="w-4 h-4 text-destructive" />
            <span className="text-destructive">{t.notifications_push_blocked}</span>
          </>
        )}
      {permissionStatus === 'granted' && !optedIn && (
          <>
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-amber-600 dark:text-amber-500">
              {t.notifications_push_granted_not_subscribed || 'Permission granted but not subscribed'}
            </span>
          </>
        )}
        {permissionStatus === 'granted' && optedIn && playerId && (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-green-600 dark:text-green-500">{t.notifications_push_enabled}</span>
          </>
        )}
      </div>

      {/* Retry Button - Shown when permission granted but subscription failed */}
      {showRetry && permissionStatus === 'granted' && !optedIn && (
        <Button
          onClick={handleTogglePush}
          disabled={isLoading}
          variant="default"
          size="sm"
          className="w-full"
        >
          Retry
        </Button>
      )}

      {/* Test Notification Button - Only shown when fully enabled */}
      {pushEnabled && permissionStatus === 'granted' && optedIn && playerId && (
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

      {/* Notification Preferences */}
      {pushEnabled && (
        <>
          <Separator className="my-4" />
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t.notifications_preferences}</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {t.notifications_daily_reminder}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t.notifications_daily_reminder_desc}
                </p>
              </div>
              <Switch
                checked={dailyReminder}
                onCheckedChange={(checked) => {
                  setDailyReminder(checked);
                  updateNotificationSettings('daily_reminder', checked);
                }}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {t.notifications_streak_alerts}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t.notifications_streak_alerts_desc}
                </p>
              </div>
              <Switch
                checked={streakAlerts}
                onCheckedChange={(checked) => {
                  setStreakAlerts(checked);
                  updateNotificationSettings('streak_alerts', checked);
                }}
                disabled={isLoading}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

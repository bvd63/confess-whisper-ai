import { Bell, Flame } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect, useMemo } from 'react';
import { NotificationService } from '@/services/notificationService';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface NotificationSettingsData {
  dailyReminder: boolean;
  dailyReminderTime: string;
  streakReminder: boolean;
}

export const NotificationSettings = () => {
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState<NotificationSettingsData>({
    dailyReminder: true,
    dailyReminderTime: '09:00',
    streakReminder: true
  });
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const service = NotificationService.getInstance();
    service.setActiveUser(user?.id ?? null);
    
    setIsLoadingSettings(true);
    service
      .getSettings()
      .then(loadedSettings => {
        if (isMounted) {
          setSettings(loadedSettings);
        }
      })
      .catch(error => {
        console.error('Failed to load notification settings', error);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Debounce helper
  function debounce<F extends (...args: any[]) => void>(fn: F, wait = 450) {
    let timeout: any;
    return (...args: Parameters<F>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  }

  const debouncedSave = useMemo(
    () =>
      debounce(async (next: NotificationSettingsData) => {
        setIsSaving(true);
        try {
          await NotificationService.getInstance().saveSettings(next);
          toast.success(t.saved_toast || 'Settings saved');
        } catch (error) {
          console.error('Failed to persist notification setting', error);
          toast.error(t.save_failed || 'Failed to save settings');
        } finally {
          setIsSaving(false);
        }
      }, 450),
    [t]
  );

  const updateSetting = async (key: keyof NotificationSettingsData, value: any) => {
    const prev = settings;
    const next = { ...settings, [key]: value };
    setSettings(next);

    setIsSaving(true);
    try {
      await NotificationService.getInstance().saveSettings(next);
      toast.success(t.saved_toast || 'Settings saved');
    } catch (error) {
      console.error('Failed to persist notification setting', error);
      toast.error(t.save_failed || 'Failed to save settings');
      setSettings(prev); // Rollback to previous
    } finally {
      setIsSaving(false);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error(t.unsupported_notice || 'Notifications are not supported in this browser');
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast.success(t.enable_notifications || 'Notifications enabled');
      await NotificationService.getInstance().initialize(user?.id ?? undefined);
    } else {
      toast.error(t.save_failed || 'Notification permission denied');
    }
  };

  const handleTestNotification = () => {
    if (!('Notification' in window)) {
      toast.error(t.unsupported_notice || 'Notifications are not supported in this browser');
      return;
    }

    if (permission !== 'granted') {
      toast.error(t.blocked_notice || 'Please enable notifications first');
      return;
    }

    new Notification(t.app_name || 'Confess App', {
      body: t.test_sent || 'This is a test notification!',
      icon: '/favicon.ico'
    });
    toast.success(t.test_sent || 'Test notification sent!');
  };

  const isInteractionDisabled = isLoadingSettings || isSaving || permission === 'denied';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t.notification_settings}</h3>
          <p className="text-sm text-muted-foreground">{t.notification_desc}</p>
        </div>
        {permission !== 'granted' && (
          <Button 
            onClick={requestPermission} 
            size="sm"
            disabled={isLoadingSettings}
          >
            {t.enable_notifications}
          </Button>
        )}
      </div>

      {permission === 'denied' && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm" role="alert">
          {t.blocked_notice}
        </div>
      )}
      
      {/* Daily Reminder */}
      <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-3 flex-1">
          <Bell className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium">{t.daily_reminder}</p>
            <p className="text-sm text-muted-foreground">
              {t.daily_reminder_desc}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={settings.dailyReminderTime}
            onChange={(e) => {
              const next = { ...settings, dailyReminderTime: e.target.value };
              setSettings(next);
              debouncedSave(next);
            }}
            className="px-2 py-1 rounded border bg-background"
            aria-label={t.reminder_time}
            disabled={!settings.dailyReminder || isInteractionDisabled}
          />
          <Switch
            checked={settings.dailyReminder ?? false}
            onCheckedChange={(v) => updateSetting('dailyReminder', v)}
            disabled={isInteractionDisabled}
            aria-label={t.daily_reminder}
          />
        </div>
      </div>

      {/* Streak Reminder */}
      <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-3 flex-1">
          <Flame className="w-5 h-5 text-orange-500" />
          <div>
            <p className="font-medium">{t.streak_protection}</p>
            <p className="text-sm text-muted-foreground">
              {t.streak_protection_desc}
            </p>
          </div>
        </div>
        <Switch
          checked={settings.streakReminder ?? false}
          onCheckedChange={(v) => updateSetting('streakReminder', v)}
          disabled={isInteractionDisabled}
          aria-label={t.streak_protection}
        />
      </div>

      {/* Test Button */}
      {permission === 'granted' && (
        <Button 
          onClick={handleTestNotification}
          variant="outline" 
          className="w-full"
          disabled={isInteractionDisabled}
        >
          {t.test_button}
        </Button>
      )}
    </div>
  );
};

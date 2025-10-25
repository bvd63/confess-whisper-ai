import { Bell, Clock, Moon, Flame } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { NotificationService } from '@/services/notificationService';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface NotificationSettingsData {
  dailyReminder: boolean;
  dailyReminderTime: string;
  nightPrompt: boolean;
  nightPromptTime: string;
  streakReminder: boolean;
}

export const NotificationSettings = () => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<NotificationSettingsData>({
    dailyReminder: true,
    dailyReminderTime: '09:00',
    nightPrompt: true,
    nightPromptTime: '21:00',
    streakReminder: true
  });
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    loadSettings();
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const loadSettings = () => {
    const stored = localStorage.getItem('notification_settings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  };

  const updateSetting = async (key: keyof NotificationSettingsData, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('notification_settings', JSON.stringify(newSettings));
    
    // Update notification schedule
    await NotificationService.getInstance().saveSettings(newSettings);
    
    toast.success('Settings saved');
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications are not supported in this browser');
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast.success('Notifications enabled');
      await NotificationService.getInstance().initialize();
    } else {
      toast.error('Notification permission denied');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Notification Settings</h3>
        {permission !== 'granted' && (
          <Button onClick={requestPermission} size="sm">
            Enable Notifications
          </Button>
        )}
      </div>

      {permission === 'denied' && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
          Notifications are blocked. Please enable them in your browser settings.
        </div>
      )}
      
      {/* Daily Reminder */}
      <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-3 flex-1">
          <Bell className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium">Daily Reminder</p>
            <p className="text-sm text-muted-foreground">
              Get reminded to share your daily confession
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={settings.dailyReminderTime}
            onChange={(e) => updateSetting('dailyReminderTime', e.target.value)}
            className="px-2 py-1 rounded border bg-background"
            disabled={!settings.dailyReminder || permission !== 'granted'}
          />
          <Switch
            checked={settings.dailyReminder}
            onCheckedChange={(v) => updateSetting('dailyReminder', v)}
            disabled={permission !== 'granted'}
          />
        </div>
      </div>

      {/* Night Prompt */}
      <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-3 flex-1">
          <Moon className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium">Evening Reflection</p>
            <p className="text-sm text-muted-foreground">
              Thoughtful prompts before bedtime
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={settings.nightPromptTime}
            onChange={(e) => updateSetting('nightPromptTime', e.target.value)}
            className="px-2 py-1 rounded border bg-background"
            disabled={!settings.nightPrompt || permission !== 'granted'}
          />
          <Switch
            checked={settings.nightPrompt}
            onCheckedChange={(v) => updateSetting('nightPrompt', v)}
            disabled={permission !== 'granted'}
          />
        </div>
      </div>

      {/* Streak Reminder */}
      <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-3 flex-1">
          <Flame className="w-5 h-5 text-orange-500" />
          <div>
            <p className="font-medium">Streak Protection</p>
            <p className="text-sm text-muted-foreground">
              Alert before your streak expires
            </p>
          </div>
        </div>
        <Switch
          checked={settings.streakReminder}
          onCheckedChange={(v) => updateSetting('streakReminder', v)}
          disabled={permission !== 'granted'}
        />
      </div>
    </div>
  );
};

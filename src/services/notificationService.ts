import { supabase } from '@/integrations/supabase/client';

interface NotificationSettings {
  dailyReminder: boolean;
  dailyReminderTime: string;
  streakReminder: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new NotificationService();
    }
    return this.instance;
  }

  private getTranslation(key: string, lang: string = 'en'): string {
    const translations: Record<string, Record<string, string>> = {
      en: {
        notification_daily_title: "Time for today's confession",
        notification_daily_body: "Take a moment to reflect and share what's on your mind",
        notification_streak_title: "Don't lose your streak! 🔥",
        notification_streak_body: "You have 4 hours left to keep your streak alive",
        notification_streak_lost_title: "Streak ended 😔",
        notification_streak_lost_body: "Start a new streak today. Every confession counts!"
      },
      es: {
        notification_daily_title: "Hora de la confesión de hoy",
        notification_daily_body: "Tómate un momento para reflexionar y compartir lo que piensas",
        notification_streak_title: "¡No pierdas tu racha! 🔥",
        notification_streak_body: "Te quedan 4 horas para mantener tu racha",
        notification_streak_lost_title: "Racha terminada 😔",
        notification_streak_lost_body: "Comienza una nueva racha hoy. ¡Cada confesión cuenta!"
      },
      de: {
        notification_daily_title: "Zeit für deine heutige Beichte",
        notification_daily_body: "Nimm dir einen Moment zum Nachdenken und teile deine Gedanken",
        notification_streak_title: "Verliere nicht deine Serie! 🔥",
        notification_streak_body: "Du hast noch 4 Stunden, um deine Serie am Leben zu erhalten",
        notification_streak_lost_title: "Serie beendet 😔",
        notification_streak_lost_body: "Starte heute eine neue Serie. Jede Beichte zählt!"
      }
    };

    const currentLang = localStorage.getItem('language') || lang;
    return translations[currentLang]?.[key] || translations.en[key] || key;
  }

  async initialize() {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      await this.setupDefaultNotifications();
      return true;
    }
    
    return false;
  }

  async setupDefaultNotifications() {
    const settings = this.getDefaultSettings();
    await this.scheduleNotifications(settings);
  }

  private getDefaultSettings(): NotificationSettings {
    const stored = localStorage.getItem('notification_settings');
    if (stored) {
      return JSON.parse(stored);
    }
    
    return {
      dailyReminder: true,
      dailyReminderTime: '09:00',
      streakReminder: true
    };
  }

  async saveSettings(settings: NotificationSettings) {
    localStorage.setItem('notification_settings', JSON.stringify(settings));
    await this.scheduleNotifications(settings);
  }

  private async scheduleNotifications(settings: NotificationSettings) {
    // Note: Web Notifications API doesn't support scheduling
    // For production, you'd need to use:
    // 1. Service Worker with periodic background sync
    // 2. Server-side push notifications
    // 3. Or implement using Capacitor Local Notifications for mobile
    
    console.log('Notification settings updated:', settings);
    
    // For now, we'll set up browser notifications that trigger based on user interaction
    // This is a placeholder for the full implementation
  }

  async showDailyReminder() {
    if (Notification.permission === 'granted') {
      new Notification(
        this.getTranslation('notification_daily_title'),
        {
          body: this.getTranslation('notification_daily_body'),
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'daily-reminder'
        }
      );
    }
  }

  async checkAndNotifyStreak(userId: string) {
    try {
      const { data: streak } = await supabase
        .from('user_streaks')
        .select('current_streak, last_confession_date')
        .eq('user_id', userId)
        .single();

      if (!streak) return;

      const lastDate = streak.last_confession_date;
      if (!lastDate) return;

      const hoursSince = (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60);
      
      // Notify if more than 20 hours since last confession
      if (hoursSince > 20 && hoursSince < 24) {
        if (Notification.permission === 'granted') {
          new Notification(
            this.getTranslation('notification_streak_title'),
            {
              body: this.getTranslation('notification_streak_body'),
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: 'streak-reminder',
              requireInteraction: true
            }
          );
        }
      }
    } catch (error) {
      console.error('Error checking streak for notification:', error);
    }
  }

  async notifyStreakLost() {
    if (Notification.permission === 'granted') {
      new Notification(
        this.getTranslation('notification_streak_lost_title'),
        {
          body: this.getTranslation('notification_streak_lost_body'),
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'streak-lost'
        }
      );
    }
  }
}

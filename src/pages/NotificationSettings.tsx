import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Moon, Sparkles, Shield } from "lucide-react";
import { useSubscription } from "@/state/SubscriptionProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";

const translations = {
  en: {
    title: "Notification Settings",
    desc: "Manage your reminders and alerts",
    daily_reminder: "Daily Reminder",
    daily_desc: "Get a daily notification to check in with your emotions",
    reminder_time: "Reminder Time",
    evening_reflection: "Evening Reflection",
    evening_desc: "Receive a nightly reflection summary (VIP only)",
    streak_protection: "Streak Protection",
    streak_desc: "Get notified when your streak is about to break",
    quiet_hours: "Quiet Hours",
    quiet_desc: "No notifications during these hours",
    from: "From",
    to: "To",
    test_button: "Send Test Notification",
    save_button: "Save Settings",
    saved: "Settings saved!",
    test_sent: "Test notification sent!",
    vip_only: "VIP Only"
  },
  es: {
    title: "Configuración de Notificaciones",
    desc: "Administra tus recordatorios y alertas",
    daily_reminder: "Recordatorio Diario",
    daily_desc: "Recibe una notificación diaria para registrar tus emociones",
    reminder_time: "Hora del Recordatorio",
    evening_reflection: "Reflexión Nocturna",
    evening_desc: "Recibe un resumen de reflexión nocturno (solo VIP)",
    streak_protection: "Protección de Racha",
    streak_desc: "Recibe notificación cuando tu racha esté a punto de romperse",
    quiet_hours: "Horas Silenciosas",
    quiet_desc: "Sin notificaciones durante estas horas",
    from: "Desde",
    to: "Hasta",
    test_button: "Enviar Notificación de Prueba",
    save_button: "Guardar Configuración",
    saved: "¡Configuración guardada!",
    test_sent: "¡Notificación de prueba enviada!",
    vip_only: "Solo VIP"
  },
  de: {
    title: "Benachrichtigungseinstellungen",
    desc: "Verwalte deine Erinnerungen und Benachrichtigungen",
    daily_reminder: "Tägliche Erinnerung",
    daily_desc: "Erhalte eine tägliche Benachrichtigung, um deine Emotionen zu überprüfen",
    reminder_time: "Erinnerungszeit",
    evening_reflection: "Abendreflexion",
    evening_desc: "Erhalte eine nächtliche Reflexionszusammenfassung (nur VIP)",
    streak_protection: "Streak-Schutz",
    streak_desc: "Werde benachrichtigt, wenn deine Streak zu brechen droht",
    quiet_hours: "Ruhezeiten",
    quiet_desc: "Keine Benachrichtigungen während dieser Stunden",
    from: "Von",
    to: "Bis",
    test_button: "Testbenachrichtigung Senden",
    save_button: "Einstellungen Speichern",
    saved: "Einstellungen gespeichert!",
    test_sent: "Testbenachrichtigung gesendet!",
    vip_only: "Nur VIP"
  }
};

const NotificationSettings = () => {
  const { subscriptionTier } = useSubscription();
  const { language } = useLanguage();
  const { toast } = useToast();
  const t = translations[language];

  const isVIP = subscriptionTier === 'vip';

  const [settings, setSettings] = useState({
    dailyReminder: false,
    reminderTime: "09:00",
    eveningReflection: false,
    streakProtection: true,
    quietHoursEnabled: false,
    quietHoursFrom: "22:00",
    quietHoursTo: "08:00"
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("notificationSettings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("notificationSettings", JSON.stringify(settings));
    toast({
      title: t.saved,
      duration: 2000
    });
  };

  const handleTest = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification("Confess App", {
            body: "This is a test notification!",
            icon: "/favicon.ico"
          });
          toast({
            title: t.test_sent,
            duration: 2000
          });
        }
      });
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => 
    `${i.toString().padStart(2, '0')}:00`
  );

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="h-6 w-6" />
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="text-muted-foreground">{t.desc}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Daily Reminder */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <div>
                    <CardTitle>{t.daily_reminder}</CardTitle>
                    <CardDescription>{t.daily_desc}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={settings.dailyReminder}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, dailyReminder: checked })
                  }
                />
              </div>
            </CardHeader>
            {settings.dailyReminder && (
              <CardContent>
                <div className="space-y-2">
                  <Label>{t.reminder_time}</Label>
                  <Select
                    value={settings.reminderTime}
                    onValueChange={(value) =>
                      setSettings({ ...settings, reminderTime: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Evening Reflection (VIP Only) */}
          <Card className={!isVIP ? "opacity-50" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {t.evening_reflection}
                      {!isVIP && (
                        <span className="text-xs bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded-full">
                          {t.vip_only}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>{t.evening_desc}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={settings.eveningReflection}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, eveningReflection: checked })
                  }
                  disabled={!isVIP}
                />
              </div>
            </CardHeader>
          </Card>

          {/* Streak Protection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <div>
                    <CardTitle>{t.streak_protection}</CardTitle>
                    <CardDescription>{t.streak_desc}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={settings.streakProtection}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, streakProtection: checked })
                  }
                />
              </div>
            </CardHeader>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="h-5 w-5" />
                  <div>
                    <CardTitle>{t.quiet_hours}</CardTitle>
                    <CardDescription>{t.quiet_desc}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={settings.quietHoursEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, quietHoursEnabled: checked })
                  }
                />
              </div>
            </CardHeader>
            {settings.quietHoursEnabled && (
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.from}</Label>
                    <Select
                      value={settings.quietHoursFrom}
                      onValueChange={(value) =>
                        setSettings({ ...settings, quietHoursFrom: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hours.map((hour) => (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.to}</Label>
                    <Select
                      value={settings.quietHoursTo}
                      onValueChange={(value) =>
                        setSettings({ ...settings, quietHoursTo: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hours.map((hour) => (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleTest} variant="outline" className="flex-1">
              {t.test_button}
            </Button>
            <Button onClick={handleSave} className="flex-1">
              {t.save_button}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default NotificationSettings;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Heart, MessageSquare, UserPlus, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface NotificationPreference {
  notify_likes: boolean;
  notify_comments: boolean;
  notify_follows: boolean;
  notify_messages: boolean;
}

export const NotificationPreferences = () => {
  const { user } = useCurrentUser();
  const [preferences, setPreferences] = useState<NotificationPreference>({
    notify_likes: true,
    notify_comments: true,
    notify_follows: true,
    notify_messages: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user?.id]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("notify_likes, notify_comments, notify_follows, notify_messages")
        .eq("user_id", user!.id)
        .single();

      if (error) {
        // If no settings exist, create default ones
        if (error.code === "PGRST116") {
          await supabase.from("notification_settings").insert({
            user_id: user!.id,
            notify_likes: true,
            notify_comments: true,
            notify_follows: true,
            notify_messages: true,
          });
        } else {
          throw error;
        }
      } else if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
      toast.error("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreference, value: boolean) => {
    if (!user?.id) return;

    try {
      // Optimistically update UI
      setPreferences((prev) => ({ ...prev, [key]: value }));

      const { error } = await supabase
        .from("notification_settings")
        .upsert({
          user_id: user.id,
          [key]: value,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Notification preference updated");
    } catch (error) {
      console.error("Error updating notification preference:", error);
      toast.error("Failed to update preference");
      // Revert optimistic update
      loadPreferences();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notification Preferences
          </CardTitle>
          <CardDescription>Loading preferences...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const preferenceItems = [
    {
      key: "notify_likes" as keyof NotificationPreference,
      icon: Heart,
      title: "Likes",
      description: "Get notified when someone likes your confession",
    },
    {
      key: "notify_comments" as keyof NotificationPreference,
      icon: MessageSquare,
      title: "Comments",
      description: "Get notified when someone comments on your confession",
    },
    {
      key: "notify_follows" as keyof NotificationPreference,
      icon: UserPlus,
      title: "Follows",
      description: "Get notified when someone follows you",
    },
    {
      key: "notify_messages" as keyof NotificationPreference,
      icon: MessageCircle,
      title: "Messages",
      description: "Get notified when you receive a direct message",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Push Notification Preferences
        </CardTitle>
        <CardDescription>
          Customize which push notifications you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {preferenceItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex items-center justify-between space-x-4">
              <div className="flex items-start space-x-3 flex-1">
                <Icon className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div className="space-y-1">
                  <Label htmlFor={item.key} className="text-base font-medium cursor-pointer">
                    {item.title}
                  </Label>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <Switch
                id={item.key}
                checked={preferences[item.key]}
                onCheckedChange={(checked) => updatePreference(item.key, checked)}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

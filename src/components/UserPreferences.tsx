import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Palette, Type } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
interface UserPreferencesProps {
  userId: string;
}
interface Preferences {
  theme: string;
  custom_color: string | null;
  font_size: string;
  avatar_seed: string | null;
}
const colors = [{
  name: 'preferences_color_violet',
  value: '#8b5cf6'
}, {
  name: 'preferences_color_blue',
  value: '#3b82f6'
}, {
  name: 'preferences_color_green',
  value: '#10b981'
}, {
  name: 'preferences_color_red',
  value: '#ef4444'
}, {
  name: 'preferences_color_orange',
  value: '#f97316'
}, {
  name: 'preferences_color_pink',
  value: '#ec4899'
}];
const UserPreferences = ({
  userId
}: UserPreferencesProps) => {
  const {
    toast
  } = useToast();
  const {
    t
  } = useLanguage();
  const [preferences, setPreferences] = useState<Preferences>({
    theme: 'dark',
    custom_color: null,
    font_size: 'medium',
    avatar_seed: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    loadPreferences();
  }, [userId]);
  const loadPreferences = async () => {
    const {
      data,
      error
    } = await supabase.from('user_preferences').select('*').eq('user_id', userId).single();
    if (!error && data) {
      setPreferences(data);
    } else if (error?.code === 'PGRST116') {
      // No preferences yet, create default
      await createDefaultPreferences();
    }
    setLoading(false);
  };
  const createDefaultPreferences = async () => {
    const {
      error
    } = await supabase.from('user_preferences').insert({
      user_id: userId,
      avatar_seed: Math.random().toString(36).substring(7)
    });
    if (!error) {
      loadPreferences();
    }
  };
  const savePreferences = async () => {
    setSaving(true);
    const {
      error
    } = await supabase.from('user_preferences').upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString()
    });
    if (error) {
      toast({
        title: t.common_error,
        description: t.preferences_save_error,
        variant: "destructive"
      });
    } else {
      toast({
        title: t.success_sent,
        description: t.preferences_save
      });

      // Apply theme if changed
      if (preferences.theme) {
        document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
      }
    }
    setSaving(false);
  };
  if (loading) return null;
  return;
};
export default UserPreferences;
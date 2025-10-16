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

const colors = [
  { name: 'preferences_color_violet', value: '#8b5cf6' },
  { name: 'preferences_color_blue', value: '#3b82f6' },
  { name: 'preferences_color_green', value: '#10b981' },
  { name: 'preferences_color_red', value: '#ef4444' },
  { name: 'preferences_color_orange', value: '#f97316' },
  { name: 'preferences_color_pink', value: '#ec4899' },
];

const UserPreferences = ({ userId }: UserPreferencesProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [preferences, setPreferences] = useState<Preferences>({
    theme: 'dark',
    custom_color: null,
    font_size: 'medium',
    avatar_seed: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      setPreferences(data);
    } else if (error?.code === 'PGRST116') {
      // No preferences yet, create default
      await createDefaultPreferences();
    }
    setLoading(false);
  };

  const createDefaultPreferences = async () => {
    const { error } = await supabase
      .from('user_preferences')
      .insert({
        user_id: userId,
        avatar_seed: Math.random().toString(36).substring(7),
      });

    if (!error) {
      loadPreferences();
    }
  };

  const savePreferences = async () => {
    setSaving(true);

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast({
        title: t.common_error,
        description: t.preferences_save_error,
        variant: "destructive",
      });
    } else {
      toast({
        title: t.success_sent,
        description: t.preferences_save,
      });
      
      // Apply theme if changed
      if (preferences.theme) {
        document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
      }
    }

    setSaving(false);
  };

  if (loading) return null;

  return (
    <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h3 className="text-base sm:text-lg font-semibold">{t.preferences_customization}</h3>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">{t.preferences_accent_color}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
              {colors.map((color) => (
                <Button
                  key={color.value}
                  variant={preferences.custom_color === color.value ? "default" : "outline"}
                  className="justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm py-2 h-auto"
                  size="sm"
                  onClick={() => setPreferences({ ...preferences, custom_color: color.value })}
                >
                  <div 
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="truncate">{t[color.name as keyof typeof t]}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs sm:text-sm">
              <Type className="w-3 h-3 sm:w-4 sm:h-4" />
              {t.preferences_text_size}
            </Label>
            <Select 
              value={preferences.font_size} 
              onValueChange={(value) => setPreferences({ ...preferences, font_size: value })}
            >
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small" className="text-xs sm:text-sm">{t.preferences_size_small}</SelectItem>
                <SelectItem value="medium" className="text-xs sm:text-sm">{t.preferences_size_medium}</SelectItem>
                <SelectItem value="large" className="text-xs sm:text-sm">{t.preferences_size_large}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={savePreferences} 
          disabled={saving}
          className="w-full text-xs sm:text-sm"
          size="sm"
        >
          {saving ? t.preferences_saving : t.preferences_save}
        </Button>
      </div>
    </Card>
  );
};

export default UserPreferences;
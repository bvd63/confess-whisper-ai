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
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Albastru', value: '#3b82f6' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Roșu', value: '#ef4444' },
  { name: 'Portocaliu', value: '#f97316' },
  { name: 'Roz', value: '#ec4899' },
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
    <Card className="p-6 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Personalizare</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Culoare accent</Label>
            <div className="grid grid-cols-3 gap-2">
              {colors.map((color) => (
                <Button
                  key={color.value}
                  variant={preferences.custom_color === color.value ? "default" : "outline"}
                  className="justify-start gap-2"
                  onClick={() => setPreferences({ ...preferences, custom_color: color.value })}
                >
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: color.value }}
                  />
                  {color.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Mărime text
            </Label>
            <Select 
              value={preferences.font_size} 
              onValueChange={(value) => setPreferences({ ...preferences, font_size: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Mic</SelectItem>
                <SelectItem value="medium">Mediu</SelectItem>
                <SelectItem value="large">Mare</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={savePreferences} 
          disabled={saving}
          className="w-full"
        >
          {saving ? t.preferences_saving : t.preferences_save}
        </Button>
      </div>
    </Card>
  );
};

export default UserPreferences;
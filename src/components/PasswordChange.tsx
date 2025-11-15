import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { logError } from "@/lib/logger";

interface PasswordChangeProps {
  userId: string;
  passwordChangedAt: string | null;
}

export const PasswordChange = ({ userId, passwordChangedAt }: PasswordChangeProps) => {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canChangePassword = () => {
    if (!passwordChangedAt) return true;
    
    const lastChanged = new Date(passwordChangedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff >= 24;
  };

  const getHoursRemaining = () => {
    if (!passwordChangedAt) return 0;
    
    const lastChanged = new Date(passwordChangedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60);
    
    return Math.max(0, Math.ceil(24 - hoursDiff));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canChangePassword()) {
      toast.error(`${t.profile_password_cooldown}. ${getHoursRemaining()} ${t.profile_hours_remaining}.`);
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t.profile_password_weak);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t.profile_password_mismatch);
      return;
    }

    if (currentPassword === newPassword) {
      toast.error(t.profile_password_same);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Update password_changed_at in profiles
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ password_changed_at: now })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast.success(t.profile_password_changed);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Trigger parent to reload the password_changed_at
      window.location.reload();
    } catch (error: any) {
      logError('Error changing password', error);
      toast.error(error.message || t.error_generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" />
          {t.profile_change_password}
        </CardTitle>
        <CardDescription>
          {!canChangePassword() && (
            <span className="text-destructive">
              {t.profile_password_cooldown}. {getHoursRemaining()} {t.profile_hours_remaining}.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">{t.profile_current_password}</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading || !canChangePassword()}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">{t.profile_new_password}</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading || !canChangePassword()}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t.profile_confirm_password}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || !canChangePassword()}
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading || !canChangePassword()}
            className="w-full"
          >
            {loading ? t.submitting : t.profile_change_password}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

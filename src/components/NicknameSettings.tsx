import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface NicknameSettingsProps {
  userId: string;
}

export const NicknameSettings = ({ userId }: NicknameSettingsProps) => {
  const { t } = useLanguage();
  const [nickname, setNickname] = useState("");
  const [currentNickname, setCurrentNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nicknameUpdatedAt, setNicknameUpdatedAt] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    loadNickname();
  }, [userId]);

  const loadNickname = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("nickname, nickname_updated_at")
        .eq("user_id", userId)
        .single();

      if (data?.nickname) {
        setCurrentNickname(data.nickname);
        setNickname(data.nickname);
      }
      
      if (data?.nickname_updated_at) {
        setNicknameUpdatedAt(data.nickname_updated_at);
        
        // Calculate days remaining until next allowed change
        const lastUpdate = new Date(data.nickname_updated_at);
        const now = new Date();
        const daysPassed = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        const remaining = Math.max(0, 21 - daysPassed);
        setDaysRemaining(remaining);
      }
    } catch (error) {
      console.error("Error loading nickname:", error);
    }
  };

  const handleUpdateNickname = async () => {
    if (!nickname || nickname.length < 3 || nickname.length > 20) {
      toast.error(t.nickname_invalid);
      return;
    }

    const nicknameRegex = /^[a-z0-9_.]{3,20}$/i;
    if (!nicknameRegex.test(nickname)) {
      toast.error(t.nickname_invalid);
      return;
    }

    // Check 21-day cooldown (only if user already has a nickname)
    if (currentNickname && nicknameUpdatedAt && daysRemaining !== null && daysRemaining > 0) {
      toast.error(`${t.nickname_cooldown}. ${daysRemaining} ${t.nickname_days_remaining}.`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          nickname: nickname.toLowerCase(),
          nickname_updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      if (error) {
        if (error.code === "23505") {
          toast.error(t.nickname_taken);
        } else {
          toast.error(t.nickname_error);
        }
      } else {
        setCurrentNickname(nickname.toLowerCase());
        setNicknameUpdatedAt(new Date().toISOString());
        setDaysRemaining(21);
        toast.success(t.nickname_updated);
      }
    } catch (error) {
      console.error("Error updating nickname:", error);
      toast.error(t.nickname_error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nickname">{t.nickname_label}</Label>
        <Input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t.nickname_placeholder}
          maxLength={20}
          className="max-w-md"
        />
        {currentNickname && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {t.nickname_label}: @{currentNickname}
            </p>
            {daysRemaining !== null && daysRemaining > 0 && (
              <p className="text-xs text-amber-500">
                {daysRemaining} {t.nickname_days_remaining}
              </p>
            )}
          </div>
        )}
      </div>
      <Button onClick={handleUpdateNickname} disabled={loading || !nickname}>
        {loading ? "..." : t.nickname_update}
      </Button>
    </div>
  );
};

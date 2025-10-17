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

  useEffect(() => {
    loadNickname();
  }, [userId]);

  const loadNickname = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("user_id", userId)
        .single();

      if (data?.nickname) {
        setCurrentNickname(data.nickname);
        setNickname(data.nickname);
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

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nickname: nickname.toLowerCase() })
        .eq("user_id", userId);

      if (error) {
        if (error.code === "23505") {
          toast.error(t.nickname_taken);
        } else {
          toast.error(t.nickname_error);
        }
      } else {
        setCurrentNickname(nickname.toLowerCase());
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
          <p className="text-xs text-muted-foreground">
            {t.nickname_label}: @{currentNickname}
          </p>
        )}
      </div>
      <Button onClick={handleUpdateNickname} disabled={loading || !nickname}>
        {loading ? "..." : t.nickname_update}
      </Button>
    </div>
  );
};

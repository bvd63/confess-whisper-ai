import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserX, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
}

interface BlockedUsersProps {
  userId: string;
}

const BlockedUsers = ({ userId }: BlockedUsersProps) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  useEffect(() => {
    loadBlockedUsers();
  }, [userId]);

  const loadBlockedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlockedUsers(data || []);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      setBlockedUsers(blockedUsers.filter(b => b.id !== blockId));
      toast({
        title: t.blocked_user_unblocked,
        description: t.blocked_user_unblocked_desc,
      });
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: t.common_error,
        description: t.blocked_users_error,
        variant: "destructive",
      });
    }
  };

  if (loading) return null;

  if (blockedUsers.length === 0) {
    return (
      <Card className="p-4 sm:p-5 text-center">
        <UserX className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
        <p className="text-sm sm:text-base text-muted-foreground">{t.blocked_users_none}</p>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
        <UserX className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        <h3 className="text-sm sm:text-base font-semibold">{t.blocked_users_title}</h3>
        <span className="text-sm text-muted-foreground ml-auto">
          {blockedUsers.length}
        </span>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        {blockedUsers.map((block) => (
          <div
            key={block.id}
            className="flex items-center justify-between p-2 sm:p-2.5 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              <div>
                <p className="text-xs sm:text-sm font-medium">{t.blocked_users_anonymous}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {t.blocked_on} {new Date(block.created_at).toLocaleDateString(
                    language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US'
                  )}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => unblockUser(block.id)}
              className="text-destructive hover:text-destructive h-8 w-8 p-0"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default BlockedUsers;

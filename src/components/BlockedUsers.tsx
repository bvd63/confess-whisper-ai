import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserX, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
        title: "Utilizator deblocat",
        description: "Vei vedea din nou confesiunile acestui utilizator",
      });
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut debloca utilizatorul",
        variant: "destructive",
      });
    }
  };

  if (loading) return null;

  if (blockedUsers.length === 0) {
    return (
      <Card className="p-6 text-center">
        <UserX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Nu ai blocat niciun utilizator</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <UserX className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Utilizatori blocați</h3>
        <span className="text-sm text-muted-foreground ml-auto">
          {blockedUsers.length}
        </span>
      </div>

      <div className="space-y-2">
        {blockedUsers.map((block) => (
          <div
            key={block.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <UserX className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Utilizator anonim</p>
                <p className="text-xs text-muted-foreground">
                  Blocat pe {new Date(block.created_at).toLocaleDateString('ro-RO')}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => unblockUser(block.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default BlockedUsers;

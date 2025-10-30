import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileEdit, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface Draft {
  id: string;
  content: string;
  category: string;
  mood?: string | null;
  mood_intensity?: number | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface DraftManagerProps {
  userId: string;
  onSelectDraft: (draft: Draft) => void;
}

const DraftManager = ({ userId, onSelectDraft }: DraftManagerProps) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadDrafts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('confession_drafts')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

  if (error) throw error;
  setDrafts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const deleteDraft = async (draftId: string) => {
    try {
      const { error } = await supabase
        .from('confession_drafts')
        .delete()
        .eq('id', draftId);

      if (error) throw error;

      setDrafts(drafts.filter(d => d.id !== draftId));
      toast({
        title: t.draft_deleted,
        description: t.draft_deleted_desc,
      });
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: t.common_error,
        description: t.draft_delete_error_desc,
        variant: "destructive",
      });
    }
  };

  if (loading) return null;
  if (drafts.length === 0) return null;

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <FileEdit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
        <h3 className="text-sm sm:text-base font-semibold">{t.drafts_saved}</h3>
        <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto">{drafts.length}</span>
      </div>

      <div className="space-y-1.5 sm:space-y-2 max-h-[280px] sm:max-h-[300px] overflow-y-auto">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="p-2 sm:p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-start justify-between gap-1.5 sm:gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm line-clamp-2 mb-0.5 sm:mb-1">{draft.content}</p>
                <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  {formatDistanceToNow(new Date(draft.updated_at), {
                    addSuffix: true,
                  })}
                </div>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectDraft(draft)}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <FileEdit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDraft(draft.id)}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default DraftManager;

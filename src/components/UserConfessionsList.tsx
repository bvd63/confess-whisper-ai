import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MessageCircle, Trash2, Sparkles, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Confession {
  id: string;
  content: string;
  ai_response?: string | null;
  ai_deep_insight?: string | null;
  created_at: string;
  likes_count?: number;
}

const UserConfessionsList = () => {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUserConfessions();
  }, []);

  const loadUserConfessions = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('confessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfessions(data || []);
    } catch (error) {
      console.error('Error loading confessions:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut încărca confesiunile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('confessions')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setConfessions(confessions.filter(c => c.id !== deleteId));
      toast({
        title: "Confesiune ștearsă",
        description: "Confesiunea a fost ștearsă cu succes.",
      });
    } catch (error) {
      console.error('Error deleting confession:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut șterge confesiunea.",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (confessions.length === 0) {
    return (
      <Card className="p-8 text-center bg-muted/30 border-border/50">
        <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">
          Nu ai postat încă nicio confesiune.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {confessions.map((confession, index) => (
          <Card
            key={confession.id}
            className="p-5 bg-card border-border/50 hover:border-primary/30 transition-all animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(confession.created_at)}</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteId(confession.id)}
                className="h-8 px-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-foreground leading-relaxed mb-3">
              {confession.content}
            </p>

            {confession.ai_response && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex items-center gap-2 mb-2 text-primary text-xs font-medium">
                  <MessageCircle className="w-3 h-3" />
                  <span>Răspuns AI</span>
                </div>
                <p className="text-sm text-foreground/80 italic line-clamp-2">
                  {confession.ai_response}
                </p>
              </div>
            )}

            {confession.ai_deep_insight && (
              <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                <Sparkles className="w-3 h-3" />
                <span>Deep Insight disponibil</span>
              </div>
            )}

            {confession.likes_count !== undefined && confession.likes_count > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {confession.likes_count} aprecieri
              </div>
            )}
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Confesiunea va fi ștearsă permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserConfessionsList;

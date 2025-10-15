import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NewConfessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfessionCreated: () => void;
}

const NewConfessionDialog = ({ open, onOpenChange, onConfessionCreated }: NewConfessionDialogProps) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Confesiunea este goală",
        description: "Te rugăm să scrii ceva înainte de a trimite.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Moderate content first
      const { data: moderationData, error: moderationError } = await supabase.functions.invoke('ai-moderation', {
        body: { content }
      });

      if (moderationError) {
        console.error('Moderation error:', moderationError);
        // Continue even if moderation fails
      }

      // Check if content is safe
      if (moderationData && !moderationData.is_safe) {
        toast({
          title: "Conținut inadecvat detectat",
          description: moderationData.reason || "Confesiunea ta conține conținut care nu respectă regulile comunității.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Step 2: Get AI response
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-confession-response', {
        body: { confession: content, type: 'basic' }
      });

      if (aiError) throw aiError;

      const responseText = aiData?.response || null;
      setAiResponse(responseText);

      // Save confession to database
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Eroare de autentificare",
          description: "Trebuie să fii autentificat pentru a posta.",
          variant: "destructive",
        });
        return;
      }

      const { error: dbError } = await supabase
        .from('confessions')
        .insert({
          content: content.trim(),
          ai_response: responseText,
          user_id: user.id,
        });

      if (dbError) throw dbError;

      toast({
        title: "Confesiune trimisă! 💜",
        description: "Răspunsul AI a fost generat.",
      });

      // Wait a bit to show the AI response
      setTimeout(() => {
        onConfessionCreated();
        onOpenChange(false);
        setContent("");
        setAiResponse(null);
      }, 3000);

    } catch (error) {
      console.error('Error submitting confession:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut trimite confesiunea. Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-card to-background border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Împărtășește-ți gândurile
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Scrie anonim ce simți. AI-ul îți va oferi un răspuns empatic.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Scrie aici ce ai pe suflet..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-none border-primary/20 focus:border-primary/40 bg-background/50"
            disabled={isSubmitting}
          />

          {aiResponse && (
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 animate-slide-up">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Răspuns AI</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed italic">
                {aiResponse}
              </p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Se procesează...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Trimite confesiunea
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewConfessionDialog;

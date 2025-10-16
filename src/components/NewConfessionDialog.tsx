import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import MoodTracker from "@/components/MoodTracker";
import ImageUpload from "@/components/ImageUpload";

const confessionSchema = z.object({
  content: z.string()
    .trim()
    .min(10, { message: "Confession must be at least 10 characters" })
    .max(2000, { message: "Confession cannot exceed 2000 characters" })
});

interface NewConfessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfessionCreated: () => void;
}

const NewConfessionDialog = ({ open, onOpenChange, onConfessionCreated }: NewConfessionDialogProps) => {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("other");
  const [mood, setMood] = useState<{ mood: string; intensity: number } | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { language, t } = useLanguage();

  const categories = [
    { value: 'relationships', label: t.category_relationships },
    { value: 'work', label: t.category_work },
    { value: 'family', label: t.category_family },
    { value: 'health', label: t.category_health },
    { value: 'money', label: t.category_money },
    { value: 'other', label: t.category_other },
  ];

  const handleSubmit = async () => {
    // Validate input
    const validation = confessionSchema.safeParse({ content });
    if (!validation.success) {
      toast({
        title: t.error_generic,
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Moderate content first
      const { data: moderationData, error: moderationError } = await supabase.functions.invoke('ai-moderation', {
        body: { content, language }
      });

      if (moderationError) {
        console.error('Moderation error:', moderationError);
        // Continue even if moderation fails
      }

      // Check if content is safe
      if (moderationData && !moderationData.is_safe) {
        toast({
          title: t.toast_flagged,
          description: moderationData.reason || t.toast_flagged,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Step 2: Get AI response
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-confession-response', {
        body: { confession: content, type: 'basic', language }
      });

      if (aiError) throw aiError;

      const responseText = aiData?.response || null;
      setAiResponse(responseText);

      if (!user) {
        toast({
          title: t.error_auth,
          description: t.error_auth,
          variant: "destructive",
        });
        return;
      }

      const { data: confessionData, error: dbError } = await supabase
        .from('confessions')
        .insert({
          content: content.trim(),
          ai_response: responseText,
          category: category,
          user_id: user.id,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Save mood if provided
      if (mood && confessionData) {
        await supabase.from('mood_entries').insert({
          user_id: user.id,
          confession_id: confessionData.id,
          mood: mood.mood,
          intensity: mood.intensity,
        });
      }

      toast({
        title: t.success_sent,
        description: t.ai_reply_title,
      });

      // Wait a bit to show the AI response
      setTimeout(() => {
        onConfessionCreated();
        onOpenChange(false);
        setContent("");
        setCategory("other");
        setImageUrl(null);
        setAiResponse(null);
      }, 3000);

    } catch (error) {
      console.error('Error submitting confession:', error);
      toast({
        title: t.error_generic,
        description: t.error_submit,
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
            {t.new_confession}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t.placeholder_confession}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              {t.select_category}
            </Label>
            <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
              <SelectTrigger className="border-primary/20 focus:border-primary/40 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            placeholder={t.placeholder_confession}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-none border-primary/20 focus:border-primary/40 bg-background/50"
            disabled={isSubmitting}
          />

          <ImageUpload
            onImageUploaded={(url) => setImageUrl(url)}
            onImageRemoved={() => setImageUrl(null)}
            currentImage={imageUrl}
            disabled={isSubmitting}
          />

          <div className="pt-2">
            <MoodTracker 
              onMoodSelect={(moodValue, intensity) => setMood({ mood: moodValue, intensity })}
            />
          </div>

          {aiResponse && (
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 animate-slide-up">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">{t.ai_reply_title}</span>
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
                {t.submitting}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t.submit}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewConfessionDialog;

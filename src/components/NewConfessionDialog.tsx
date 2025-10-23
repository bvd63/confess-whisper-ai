import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { EnhancedButton } from "@/components/EnhancedButton";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import MoodTracker from "@/components/MoodTracker";
import ImageUpload from "@/components/ImageUpload";
import DraftManager from "@/components/DraftManager";
import { CrisisDialog } from "@/components/CrisisDialog";
import { useModerationStatus } from "@/hooks/useModerationStatus";
import { LocationPicker } from "@/components/LocationPicker";
import { useCommunities } from "@/hooks/useCommunities";
import { PolishConfessionButton } from "@/components/PolishConfessionButton";
import { useConfessionLimits } from "@/hooks/useConfessionLimits";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useConfessionRateLimit } from "@/hooks/useConfessionRateLimit";
import { RateLimitIndicator } from "@/components/RateLimitIndicator";
import { filterContent, getWarningMessage } from "@/lib/security/contentFilter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useHaptic } from "@/hooks/useHaptic";

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

export function NewConfessionDialog({ open, onOpenChange, onConfessionCreated }: NewConfessionDialogProps) {
  const supabase = getSupabase();
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("other");
  const [mood, setMood] = useState<{ mood: string; intensity: number } | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [showCrisisDialog, setShowCrisisDialog] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showContentWarning, setShowContentWarning] = useState(false);
  const [contentWarnings, setContentWarnings] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number; city?: string; country?: string } | null>(null);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const { checkForCrisis } = useModerationStatus();
  const { communities } = useCommunities();
  const { canPost, currentCount, dailyLimit, remaining, tier, checkLimits, incrementCount, isLoading: limitsLoading } = useConfessionLimits();
  const { vibrate } = useHaptic();
  const { 
    isLimited, 
    remainingRequests, 
    totalRequests, 
    checkRateLimit, 
    getRemainingTime,
    percentage 
  } = useConfessionRateLimit();

  // Check for crisis keywords on content change
  useEffect(() => {
    if (content.length > 20 && checkForCrisis(content)) {
      setShowCrisisDialog(true);
    }
  }, [content, checkForCrisis]);

  // Auto-save draft every 5 seconds
  useEffect(() => {
    if (!user || !content.trim() || content.length < 10) return;

    const timer = setTimeout(async () => {
      try {
        if (currentDraftId) {
          // Update existing draft
          await supabase
            .from('confession_drafts')
            .update({
              content: content.trim(),
              category,
              mood: mood?.mood,
              mood_intensity: mood?.intensity,
              image_url: imageUrl,
            })
            .eq('id', currentDraftId);
        } else {
          // Create new draft
          const { data } = await supabase
            .from('confession_drafts')
            .insert({
              user_id: user.id,
              content: content.trim(),
              category,
              mood: mood?.mood,
              mood_intensity: mood?.intensity,
              image_url: imageUrl,
            })
            .select()
            .single();

          if (data) {
            setCurrentDraftId(data.id);
          }
        }
      } catch (error) {
        console.error('Error auto-saving draft:', error);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [content, category, mood, imageUrl, user, currentDraftId]);

  const categories = [
    { value: 'relationships', label: t.category_relationships },
    { value: 'work', label: t.category_work },
    { value: 'family', label: t.category_family },
    { value: 'health', label: t.category_health },
    { value: 'money', label: t.category_money },
    { value: 'other', label: t.category_other },
  ];

  const handleSubmit = async () => {
    // Check content for personal information
    const contentCheck = filterContent(content);
    if (!contentCheck.safe) {
      const warnings = contentCheck.warnings.map(w => getWarningMessage(w, language as 'en' | 'es' | 'de'));
      setContentWarnings(warnings);
      setShowContentWarning(true);
      return;
    }

    await proceedWithSubmit();
  };

  const proceedWithSubmit = async () => {
    setShowContentWarning(false);
    
    // Check rate limit first
    const rateLimitAllowed = await checkRateLimit('confession_create');
    if (!rateLimitAllowed) {
      toast({
        title: t.rate_limit_title,
        description: t.system_rate_limit_exceeded.replace('{seconds}', getRemainingTime()),
        variant: "destructive",
      });
      return;
    }

    // Check confession limits
    if (!canPost) {
      setShowUpgradeModal(true);
      return;
    }

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

    vibrate('medium');
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
        body: { 
          confession: content, 
          category, 
          imageUrl, 
          type: 'basic', 
          language 
        }
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
          community_id: communityId,
          location_enabled: !!location,
          location_lat: location?.lat,
          location_lng: location?.lng,
          location_city: location?.city,
          location_country: location?.country,
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

      // Increment confession count
      await incrementCount();

      toast({
        title: t.success_sent,
        description: t.ai_reply_title,
      });

      // Delete draft if it exists
      if (currentDraftId) {
        await supabase
          .from('confession_drafts')
          .delete()
          .eq('id', currentDraftId);
      }

      // Wait a bit to show the AI response
      setTimeout(() => {
        onConfessionCreated();
        onOpenChange(false);
        setContent("");
        setCategory("other");
        setImageUrl(null);
        setAiResponse(null);
        setCurrentDraftId(null);
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto glass-strong border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl text-gradient-hero">{t.new_confession}</span>
            {!limitsLoading && (
              dailyLimit !== Infinity ? (
                <Badge variant={remaining > 2 ? "default" : "destructive"} className="ml-2">
                  {remaining}/{dailyLimit}
                </Badge>
              ) : (
                <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0 ml-2">
                  ∞
                </Badge>
              )
            )}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            {t.placeholder_confession}
          </DialogDescription>
          {/* Confession Quota Display */}
          {!limitsLoading && dailyLimit !== Infinity && (
            <div className="mt-2 p-2 glass rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                {remaining === Infinity 
                  ? t.limit_confessions_unlimited
                  : t.limit_confessions_remaining.replace('{count}', remaining.toString())}
              </p>
            </div>
          )}
          
          {/* Rate Limit Indicator */}
          <RateLimitIndicator
            remaining={remainingRequests}
            total={totalRequests}
            resetTime={getRemainingTime()}
            isLimited={isLimited}
            className="mt-2"
          />
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
          {user && (
            <DraftManager
              userId={user.id}
              onSelectDraft={(draft) => {
                setContent(draft.content);
                setCategory(draft.category);
                setCurrentDraftId(draft.id);
                if (draft.mood_intensity) {
                  setMood({ mood: draft.mood || 'neutral', intensity: draft.mood_intensity });
                }
                if (draft.image_url) {
                  setImageUrl(draft.image_url);
                }
              }}
            />
          )}

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
            className="min-h-[120px] sm:min-h-[150px] resize-none border-primary/20 focus:border-primary/40 bg-background/50 text-sm"
            disabled={isSubmitting}
          />

          <ImageUpload
            onImageUploaded={(url) => setImageUrl(url)}
            onImageRemoved={() => setImageUrl(null)}
            currentImage={imageUrl}
            disabled={isSubmitting}
          />

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.location_community_optional}</Label>
            <Select value={communityId || "none"} onValueChange={(v) => setCommunityId(v === "none" ? null : v)} disabled={isSubmitting}>
              <SelectTrigger className="border-primary/20 focus:border-primary/40 bg-background/50">
                <SelectValue placeholder={t.location_select_community} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.location_no_community}</SelectItem>
                {communities?.map((community) => (
                  <SelectItem key={community.id} value={community.id}>
                    {community.icon} {community.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">{t.location_optional}</Label>
            <LocationPicker
              onLocationSelect={setLocation}
              initialLocation={location}
            />
          </div>

          <div className="pt-2">
            <MoodTracker 
              onMoodSelect={(moodValue, intensity) => setMood({ mood: moodValue, intensity })}
            />
          </div>

          {aiResponse && (
            <div className="p-4 glass rounded-lg border border-primary/20 animate-slide-up">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Sparkles className="w-4 h-4 animate-pulse-glow" />
                <span className="text-sm font-medium">{t.ai_reply_title}</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed italic">
                {aiResponse}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <PolishConfessionButton 
              confessionText={content}
              onPolishedTextReceived={(polished) => setContent(polished)}
              disabled={isSubmitting}
            />
            <EnhancedButton
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim() || isLimited}
              className="w-full"
              glow
              shine
              lift
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.submitting}
                </>
              ) : isLimited ? (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {t.rate_limit_title}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t.submit}
                </>
              )}
            </EnhancedButton>
          </div>
        </div>
      </DialogContent>
      
      {/* Content Warning Dialog */}
      <AlertDialog open={showContentWarning} onOpenChange={setShowContentWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {t.content_warning_title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.content_warning_detected}
              <ul className="mt-2 space-y-1">
                {contentWarnings.map((warning, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {warning}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common_cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithSubmit}>
              {t.content_warning_continue}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <CrisisDialog 
        isOpen={showCrisisDialog}
        onClose={() => setShowCrisisDialog(false)}
      />
      
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentTier={tier}
        currentCount={currentCount}
        dailyLimit={dailyLimit === Infinity ? 0 : dailyLimit}
      />
    </Dialog>
  );
};

export default NewConfessionDialog;

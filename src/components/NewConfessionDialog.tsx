import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { EnhancedButton } from "@/components/EnhancedButton";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { sanitizeConfession } from "@/lib/security/sanitizer";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import MoodTracker from "@/components/MoodTracker";
import ImageUpload from "@/components/ImageUpload";
import DraftManager from "@/components/DraftManager";
import { CrisisDialog } from "@/components/CrisisDialog";
import { Switch } from "@/components/ui/switch";
import { useModerationStatus } from "@/hooks/useModerationStatus";
// Communities feature disabled
// import { useCommunities } from "@/hooks/useCommunities";
import { PolishConfessionButton } from "@/components/PolishConfessionButton";
import { useConfessionLimits } from "@/hooks/useConfessionLimits";
// import { UpgradeModal } from "@/components/UpgradeModal";
import { useMobileKeyboard } from "@/hooks/useMobileKeyboard";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { getAiReply, type AiLocale } from "@/services/aiService";
import { Turnstile } from "@marsidev/react-turnstile";
import { env } from "@/lib/env";
import { logError, logWarn, logInfo } from "@/lib/logger";
import { normalizeCreateConfessionPayload } from "../../supabase/functions/create-confession/utils";

const confessionSchema = z.object({
  content: z.string()
    .trim()
    .min(10, { message: "Confession must be at least 10 characters" })
    .max(2000, { message: "Confession cannot exceed 2000 characters" })
});

const isFunctionInvokeError = (value: unknown): value is { status?: number; message?: string } =>
  typeof value === 'object' && value !== null && ('status' in value || 'message' in value);

interface NewConfessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfessionCreated: () => void;
  initialCommunityId?: string | null;
}

const NewConfessionDialog = ({ open, onOpenChange, onConfessionCreated, initialCommunityId }: NewConfessionDialogProps) => {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("other");
  const [mood, setMood] = useState<{ mood: string; intensity: number } | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [showCrisisDialog, setShowCrisisDialog] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // Communities feature disabled - always set to null
  const [communityId, setCommunityId] = useState<string | null>(null);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const { checkForCrisis } = useModerationStatus();
  // Communities feature disabled
  // const { communities } = useCommunities();
  const { canPost, currentCount, dailyLimit, remaining, tier, checkLimits, incrementCount, isLoading: limitsLoading } = useConfessionLimits();
  const { isKeyboardVisible, keyboardHeight } = useMobileKeyboard();
  const { subscriptionTier } = useVipStatus(user?.id || null);
  const isVip = subscriptionTier === 'vip';
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const [captchaRenderKey, setCaptchaRenderKey] = useState(0);

  useEffect(() => {
    if (!open) {
      setCaptchaToken(null);
      setTurnstileError(false);
      setCaptchaRenderKey((key) => key + 1);
    }
  }, [open]);

  // Fetch user's nickname
  useEffect(() => {
    if (!user) return;
    
    const fetchNickname = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('user_id', user.id)
        .single();
      
      if (data?.nickname) {
        setUserNickname(data.nickname);
      }
    };
    
    fetchNickname();
  }, [user]);

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
        logError('Error auto-saving draft', error);
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
    // Check confession limits first
    if (!canPost) {
      toast({
        title: t.error_generic,
        description: dailyLimit !== Infinity
          ? t.limit_confessions_remaining.replace('{count}', '0')
          : t.error_submit,
        variant: "destructive",
      });
      setShowUpgradeModal(true);
      return;
    }
 
    // Validate input
    const normalized = normalizeCreateConfessionPayload({
      content,
      category,
      communityId,
      imageUrl,
      isAnonymous,
      aiResponse: aiResponse ?? undefined,
      mood,
      captchaToken,
      authorDisplayName: isAnonymous ? null : userNickname,
    });

    if (normalized.ok === false) {
      const errorCode = normalized.error.code;
      if (errorCode === "INVALID_CONTENT") {
        toast({
          title: t.error_generic,
          description: t.confession_invalid_content ?? "Confession content is invalid.",
          variant: "destructive",
        });
      } else {
        toast({
          title: t.error_generic,
          description: t.confession_too_short ?? "Confession must be at least 10 characters long.",
          variant: "destructive",
        });
      }
      return;
    }

    const normalizedPayload = normalized.data;
    logInfo('Confession payload normalized', {
      contentLength: normalizedPayload.contentLength,
      category: normalizedPayload.category,
      isAnonymous: normalizedPayload.isAnonymous,
      hasCaptchaToken: Boolean(normalizedPayload.captchaToken),
    });

    setIsSubmitting(true);

    try {
      // If Turnstile is required by feature flag, ensure we have a token
      if (env.features.confessionTurnstileRequired && !captchaToken) {
        toast({
          title: t.error_generic,
          description: t.auth_captcha_failed || "Please complete the CAPTCHA before submitting.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Step 1: Moderate content first. Include captchaToken when available so server-side
      // code (if extended) can verify the token before accepting a confession.
      const { data: moderationData, error: moderationError } = await supabase.functions.invoke('ai-moderation', {
        body: { content, language, captchaToken }
      });

      if (moderationError) {
        logError('Moderation error', moderationError as Error);
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

      // Step 2: Get AI response (with VIP priority)
      let responseText: string | null = null;
      try {
        const locale = (language === 'en' || language === 'es' || language === 'de') 
          ? language as AiLocale 
          : 'en';
        
        responseText = await getAiReply({
          text: content.trim(),
          isVip,
          locale,
          userId: user.id,
          confessionId: 'temp' // Will be replaced with actual ID after creation
        });
        
        setAiResponse(responseText);
      } catch (aiError) {
        logError('AI response error', aiError as Error);
        // Continue without AI response - not critical
        responseText = null;
      }

      if (!user) {
        toast({
          title: t.error_auth,
          description: t.error_auth,
          variant: "destructive",
        });
        return;
      }

      logInfo('Invoking create-confession function', {
        hasSupabaseFunctions: Boolean((supabase as any).functions),
      });

      const creationResponse = await supabase.functions.invoke('create-confession', {
        body: {
          ...normalizedPayload,
          aiResponse: responseText ?? normalizedPayload.aiResponse,
        },
      });

      if (creationResponse.error) {
        const rawError = creationResponse.error;
        const errorStatus = isFunctionInvokeError(rawError) && typeof rawError.status === 'number'
          ? rawError.status
          : 400;

        let messageKey: string | undefined;
        let serverMessage = isFunctionInvokeError(rawError) && typeof rawError.message === 'string'
          ? rawError.message
          : undefined;

        if (serverMessage) {
          try {
            const parsed = JSON.parse(serverMessage);
            messageKey = parsed?.messageKey ?? messageKey;
            serverMessage = parsed?.message || serverMessage;
          } catch (parseError) {
            logWarn('Failed to parse confession creation error payload', { error: parseError });
          }
        }

        const responsePayload = creationResponse.data as { messageKey?: string; message?: string } | undefined;
        if (!messageKey && typeof responsePayload?.messageKey === 'string') {
          messageKey = responsePayload.messageKey;
        }
        if (!serverMessage && typeof responsePayload?.message === 'string') {
          serverMessage = responsePayload.message;
        }

        const translationKey = messageKey?.replace(/\./g, '_');
        const localizedMessage = translationKey && translationKey in t
          ? t[translationKey as keyof typeof t] as string
          : undefined;
        const fallbackMessage = localizedMessage || serverMessage || t.error_submit;

        if (errorStatus === 429 || messageKey === 'common.rate_limit') {
          toast({
            title: t.rate_limit_title || t.error_generic,
            description: localizedMessage || t.common_rate_limit || serverMessage || t.error_submit,
            variant: "destructive",
          });
        } else if (errorStatus === 403 || messageKey === 'auth.captcha_failed') {
          setTurnstileError(true);
          setCaptchaToken(null);
          setCaptchaRenderKey((key) => key + 1);
          toast({
            title: t.error_generic,
            description: localizedMessage || t.auth_captcha_failed || serverMessage || t.error_submit,
            variant: "destructive",
          });
        } else {
          toast({
            title: t.error_generic,
            description: fallbackMessage,
            variant: "destructive",
          });
        }

        return;
      }

      const confessionData = creationResponse.data?.confession;

      if (!confessionData) {
        throw new Error('Confession creation failed');
      }

      // Increment confession count
      await incrementCount();

      // Reset CAPTCHA state after a successful submission
      setCaptchaToken(null);
      setTurnstileError(false);
      setCaptchaRenderKey((key) => key + 1);

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
      logError('Error submitting confession', error as Error);
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
      <DialogContent 
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-primary/20 rounded-3xl shadow-2xl"
        style={{
          marginBottom: isKeyboardVisible ? `${keyboardHeight}px` : '0',
          transition: 'margin-bottom 0.3s ease-out'
        }}
      >
        {/* Custom Header - with right padding to avoid X button overlap */}
        <div className="flex items-start justify-between gap-4 pb-2 pr-8">
          <h2 className="text-2xl font-bold text-foreground">{t.new_confession}</h2>
          <DialogDescription className="sr-only">
            {t.placeholder_confession}
          </DialogDescription>
          {!limitsLoading && (
            <div className="flex-shrink-0">
              {dailyLimit !== Infinity ? (
                <Badge 
                  variant={remaining > 2 ? "default" : "destructive"} 
                  className="px-3 py-1.5 rounded-full text-sm font-semibold"
                >
                  {remaining}/{dailyLimit}
                </Badge>
              ) : (
                <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm">
                  ∞ VIP
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="space-y-5 py-4">
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

          {/* Main Confession Text Area - Glassmorphism Card */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/80 to-primary/5 backdrop-blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
            <Textarea
              placeholder={t.placeholder_confession}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="relative min-h-[180px] resize-none bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base text-foreground placeholder:text-muted-foreground/60 p-5 rounded-2xl"
              disabled={isSubmitting}
            />
          </div>

          {/* Category Selector */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium text-foreground/80">
              {t.select_category}
            </Label>
            <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
              <SelectTrigger className="border-primary/20 focus:border-primary/40 bg-muted/30 backdrop-blur-sm h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-background/95 backdrop-blur-xl border-primary/20">
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} className="rounded-lg">
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ImageUpload
            onImageUploaded={(url) => setImageUrl(url)}
            onImageRemoved={() => setImageUrl(null)}
            currentImage={imageUrl}
            disabled={isSubmitting}
          />

          <div className="pt-1">
            <MoodTracker 
              onMoodSelect={(moodValue, intensity) => setMood({ mood: moodValue, intensity })}
            />
          </div>

          {/* Anonymous Toggle - Premium Style */}
          <div className="flex items-center justify-between p-4 bg-muted/30 backdrop-blur-sm rounded-2xl border border-primary/10">
            <div className="flex flex-col gap-1">
              <Label htmlFor="anonymous-toggle" className="text-sm font-medium cursor-pointer text-foreground">
                {t.confession_anonymous_label}
              </Label>
              {!isAnonymous && userNickname && (
                <p className="text-xs text-primary font-medium">
                  {t.confession_anonymous_preview.replace('{name}', `@${userNickname}`)}
                </p>
              )}
            </div>
            <Switch
              id="anonymous-toggle"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
              disabled={isSubmitting}
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30"
            />
          </div>

          {aiResponse && (
            <div className="p-4 bg-primary/5 backdrop-blur-sm rounded-2xl border border-primary/20 animate-slide-up">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Sparkles className="w-4 h-4 animate-pulse-glow" />
                <span className="text-sm font-medium">{t.ai_reply_title}</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed italic">
                {aiResponse}
              </p>
            </div>
          )}

          {env.features.confessionTurnstileRequired && (
            <div className="space-y-2">
              {turnstileError && (
                <p className="text-xs text-destructive">{t.auth_captcha_failed || 'CAPTCHA failed, please try again.'}</p>
              )}
              <Turnstile
                key={captchaRenderKey}
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                onSuccess={(token) => {
                  setCaptchaToken(token);
                  setTurnstileError(false);
                }}
                onError={() => {
                  setCaptchaToken(null);
                  setTurnstileError(true);
                }}
                onExpire={() => {
                  setCaptchaToken(null);
                  setTurnstileError(true);
                }}
                options={{
                  theme: 'auto',
                  size: 'normal',
                }}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 pt-3">
            <PolishConfessionButton 
              confessionText={content}
              onPolishedTextReceived={(polished) => setContent(polished)}
              disabled={isSubmitting}
            />
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim() || !canPost || (dailyLimit !== Infinity && remaining === 0)}
              className="w-full h-14 rounded-2xl font-semibold text-base text-white bg-gradient-to-r from-primary/95 via-purple-600/90 to-primary/95 hover:from-primary hover:via-purple-500 hover:to-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.submitting}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {t.post_confession || "Post Confession"}
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
      
      <CrisisDialog 
        isOpen={showCrisisDialog}
        onClose={() => setShowCrisisDialog(false)}
      />
    </Dialog>
  );
};

export default NewConfessionDialog;

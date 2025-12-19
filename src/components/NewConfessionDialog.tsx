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
import ImageUpload from "@/components/ImageUpload";
import DraftManager from "@/components/DraftManager";
import { CrisisDialog } from "@/components/CrisisDialog";
import { PostAnonymousSwitch } from "@/components/ui/PostAnonymousSwitch";
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
  content: z.string().trim().min(10, {
    message: "Confession must be at least 10 characters"
  }).max(2000, {
    message: "Confession cannot exceed 2000 characters"
  })
});
const isFunctionInvokeError = (value: unknown): value is {
  status?: number;
  message?: string;
} => typeof value === 'object' && value !== null && ('status' in value || 'message' in value);
interface NewConfessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfessionCreated: () => void;
  initialCommunityId?: string | null;
}
const NewConfessionDialog = ({
  open,
  onOpenChange,
  onConfessionCreated,
  initialCommunityId
}: NewConfessionDialogProps) => {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("other");
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
  const {
    user
  } = useCurrentUser();
  const {
    toast
  } = useToast();
  const {
    language,
    t
  } = useLanguage();
  const {
    checkForCrisis
  } = useModerationStatus();
  // Communities feature disabled
  // const { communities } = useCommunities();
  const {
    canPost,
    currentCount,
    dailyLimit,
    remaining,
    tier,
    checkLimits,
    incrementCount,
    isLoading: limitsLoading
  } = useConfessionLimits();
  const {
    isKeyboardVisible,
    keyboardHeight
  } = useMobileKeyboard();
  const {
    subscriptionTier
  } = useVipStatus(user?.id || null);
  const isVip = subscriptionTier === 'vip';
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const [captchaRenderKey, setCaptchaRenderKey] = useState(0);
  useEffect(() => {
    if (!open) {
      setCaptchaToken(null);
      setTurnstileError(false);
      setCaptchaRenderKey(key => key + 1);
    }
  }, [open]);

  // Fetch user's nickname
  useEffect(() => {
    if (!user) return;
    const fetchNickname = async () => {
      const {
        data
      } = await supabase.from('profiles').select('nickname').eq('user_id', user.id).single();
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
          await supabase.from('confession_drafts').update({
            content: content.trim(),
            category,
            image_url: imageUrl
          }).eq('id', currentDraftId);
        } else {
          // Create new draft
          const {
            data
          } = await supabase.from('confession_drafts').insert({
            user_id: user.id,
            content: content.trim(),
            category,
            image_url: imageUrl
          }).select().single();
          if (data) {
            setCurrentDraftId(data.id);
          }
        }
      } catch (error) {
        logError('Error auto-saving draft', error);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [content, category, imageUrl, user, currentDraftId]);
  const categories = [{
    value: 'relationships',
    label: t.category_relationships
  }, {
    value: 'work',
    label: t.category_work
  }, {
    value: 'family',
    label: t.category_family
  }, {
    value: 'health',
    label: t.category_health
  }, {
    value: 'money',
    label: t.category_money
  }, {
    value: 'other',
    label: t.category_other
  }];
  const handleSubmit = async () => {
    // Check confession limits first
    if (!canPost) {
      toast({
        title: t.error_generic,
        description: dailyLimit !== Infinity ? t.limit_confessions_remaining.replace('{count}', '0') : t.error_submit,
        variant: "destructive"
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
      captchaToken,
      authorDisplayName: isAnonymous ? null : userNickname
    });
    if (normalized.ok === false) {
      const errorCode = normalized.error.code;
      if (errorCode === "INVALID_CONTENT") {
        toast({
          title: t.error_generic,
          description: t.confession_invalid_content ?? "Confession content is invalid.",
          variant: "destructive"
        });
      } else {
        toast({
          title: t.error_generic,
          description: t.confession_too_short ?? "Confession must be at least 10 characters long.",
          variant: "destructive"
        });
      }
      return;
    }
    const normalizedPayload = normalized.data;
    logInfo('Confession payload normalized', {
      contentLength: normalizedPayload.contentLength,
      category: normalizedPayload.category,
      isAnonymous: normalizedPayload.isAnonymous,
      hasCaptchaToken: Boolean(normalizedPayload.captchaToken)
    });
    setIsSubmitting(true);
    try {
      // If Turnstile is required by feature flag, ensure we have a token
      if (env.features.confessionTurnstileRequired && !captchaToken) {
        toast({
          title: t.error_generic,
          description: t.auth_captcha_failed || "Please complete the CAPTCHA before submitting.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Step 1: Moderate content first. Include captchaToken when available so server-side
      // code (if extended) can verify the token before accepting a confession.
      const {
        data: moderationData,
        error: moderationError
      } = await supabase.functions.invoke('ai-moderation', {
        body: {
          content,
          language,
          captchaToken
        }
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
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Step 2: Get AI response (with VIP priority)
      let responseText: string | null = null;
      try {
        const locale = language === 'en' || language === 'es' || language === 'de' ? language as AiLocale : 'en';
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
          variant: "destructive"
        });
        return;
      }
      logInfo('Invoking create-confession function', {
        hasSupabaseFunctions: Boolean((supabase as any).functions)
      });
      const creationResponse = await supabase.functions.invoke('create-confession', {
        body: {
          ...normalizedPayload,
          aiResponse: responseText ?? normalizedPayload.aiResponse
        }
      });
      if (creationResponse.error) {
        const rawError = creationResponse.error;
        const errorStatus = isFunctionInvokeError(rawError) && typeof rawError.status === 'number' ? rawError.status : 400;
        let messageKey: string | undefined;
        let serverMessage = isFunctionInvokeError(rawError) && typeof rawError.message === 'string' ? rawError.message : undefined;
        if (serverMessage) {
          try {
            const parsed = JSON.parse(serverMessage);
            messageKey = parsed?.messageKey ?? messageKey;
            serverMessage = parsed?.message || serverMessage;
          } catch (parseError) {
            logWarn('Failed to parse confession creation error payload', {
              error: parseError
            });
          }
        }
        const responsePayload = creationResponse.data as {
          messageKey?: string;
          message?: string;
        } | undefined;
        if (!messageKey && typeof responsePayload?.messageKey === 'string') {
          messageKey = responsePayload.messageKey;
        }
        if (!serverMessage && typeof responsePayload?.message === 'string') {
          serverMessage = responsePayload.message;
        }
        const translationKey = messageKey?.replace(/\./g, '_');
        const localizedMessage = translationKey && translationKey in t ? t[translationKey as keyof typeof t] as string : undefined;
        const fallbackMessage = localizedMessage || serverMessage || t.error_submit;
        if (errorStatus === 429 || messageKey === 'common.rate_limit') {
          toast({
            title: t.rate_limit_title || t.error_generic,
            description: localizedMessage || t.common_rate_limit || serverMessage || t.error_submit,
            variant: "destructive"
          });
        } else if (errorStatus === 403 || messageKey === 'auth.captcha_failed') {
          setTurnstileError(true);
          setCaptchaToken(null);
          setCaptchaRenderKey(key => key + 1);
          toast({
            title: t.error_generic,
            description: localizedMessage || t.auth_captcha_failed || serverMessage || t.error_submit,
            variant: "destructive"
          });
        } else {
          toast({
            title: t.error_generic,
            description: fallbackMessage,
            variant: "destructive"
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
      setCaptchaRenderKey(key => key + 1);
      toast({
        title: t.success_sent,
        description: t.ai_reply_title
      });

      // Delete draft if it exists
      if (currentDraftId) {
        await supabase.from('confession_drafts').delete().eq('id', currentDraftId);
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
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const isUnlimited = dailyLimit === Infinity;
  const quotaHelperText = isUnlimited
    ? t.limit_confessions_unlimited
    : t.limit_confessions_remaining.replace('{count}', remaining.toString());
  const primaryCtaLabel = t.post_confession || t.submit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-primary/20 rounded-3xl shadow-2xl"
        style={{
          marginBottom: isKeyboardVisible ? `${keyboardHeight}px` : '0',
          transition: 'margin-bottom 0.3s ease-out'
        }}
      >
        <DialogHeader className="space-y-0">
          <div className="flex items-center justify-between pr-10">
            <DialogTitle className="text-xl font-semibold text-foreground">
              {t.new_confession}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {user && <DraftManager userId={user.id} onSelectDraft={draft => {
          setContent(draft.content);
          setCategory(draft.category);
          setCurrentDraftId(draft.id);
          if (draft.image_url) {
            setImageUrl(draft.image_url);
          }
        }} />}

          {/* Main Confession Text Area - Glassmorphism Card */}
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-600/10 to-purple-500/10 backdrop-blur-md" />
            <Textarea 
              placeholder="What's on your mind..." 
              value={content} 
              onChange={e => setContent(e.target.value)} 
              className="relative min-h-[240px] resize-none bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base text-foreground placeholder:text-muted-foreground/50 p-6 rounded-3xl" 
              disabled={isSubmitting} 
            />
          </div>

          {/* Controls Panel - Compact Action Cluster */}
          <div className="space-y-3">
            {/* Category and Add Image - Same Row */}
            <div className="flex gap-2.5">
              <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
                <SelectTrigger className="flex-1 border-white/10 bg-white/5 backdrop-blur-sm h-11 rounded-xl text-sm">
                  <SelectValue placeholder={t.select_category} />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-background/95 backdrop-blur-xl border-white/10">
                  {categories.map(cat => <SelectItem key={cat.value} value={cat.value} className="rounded-lg">
                      {cat.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              
              <ImageUpload 
                onImageUploaded={url => setImageUrl(url)} 
                onImageRemoved={() => setImageUrl(null)} 
                currentImage={imageUrl} 
                disabled={isSubmitting} 
              />
            </div>

            {/* Post Anonymously Toggle */}
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="anonymous-toggle" className="text-sm font-medium cursor-pointer text-foreground">
                {t.confession_anonymous_label}
              </Label>
              <PostAnonymousSwitch 
                id="anonymous-toggle" 
                checked={isAnonymous} 
                onCheckedChange={setIsAnonymous} 
                disabled={isSubmitting} 
              />
            </div>

            {/* Enhance with AI Button */}
            <PolishConfessionButton 
              confessionText={content}
              onPolishedTextReceived={(polished) => setContent(polished)}
              disabled={isSubmitting}
            />
          </div>

          {env.features.confessionTurnstileRequired && <div className="space-y-2">
              {turnstileError && <p className="text-xs text-destructive">{t.auth_captcha_failed || 'CAPTCHA failed, please try again.'}</p>}
              <Turnstile key={captchaRenderKey} siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"} onSuccess={token => {
            setCaptchaToken(token);
            setTurnstileError(false);
          }} onError={() => {
            setCaptchaToken(null);
            setTurnstileError(true);
          }} onExpire={() => {
            setCaptchaToken(null);
            setTurnstileError(true);
          }} options={{
            theme: 'auto',
            size: 'normal'
          }} />
            </div>}

          {/* Primary CTA - Post Confession */}
          <div className="pt-4">
            <EnhancedButton
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim() || !canPost || (!isUnlimited && remaining === 0)}
              className="w-full h-14 rounded-2xl font-semibold text-base text-white bg-gradient-to-r from-primary/95 via-purple-600/90 to-primary/95 hover:from-primary hover:via-purple-500 hover:to-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25"
              glow
              shine
              lift
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t.submitting}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  {primaryCtaLabel}
                </>
              )}
            </EnhancedButton>
          </div>
        </div>
      </DialogContent>
      
      <CrisisDialog isOpen={showCrisisDialog} onClose={() => setShowCrisisDialog(false)} />
    </Dialog>
  );
};

export default NewConfessionDialog;
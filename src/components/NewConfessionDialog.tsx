import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { EnhancedButton } from "@/components/EnhancedButton";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles, ChevronDown, Image as ImageIcon, ChevronRight, Coins, X, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { sanitizeConfession } from "@/lib/security/sanitizer";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import DraftManager from "@/components/DraftManager";
import { CrisisDialog } from "@/components/CrisisDialog";
import { Switch } from "@/components/ui/switch";
import { useModerationStatus } from "@/hooks/useModerationStatus";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useConfessionLimits } from "@/hooks/useConfessionLimits";
import { useMobileKeyboard } from "@/hooks/useMobileKeyboard";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { getAiReply, type AiLocale } from "@/services/aiService";
import { Turnstile } from "@marsidev/react-turnstile";
import { env } from "@/lib/env";
import { logError, logWarn, logInfo } from "@/lib/logger";
import { normalizeCreateConfessionPayload } from "../../supabase/functions/create-confession/utils";
import { cn } from "@/lib/utils";

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
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const { checkForCrisis } = useModerationStatus();
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
      setCaptchaRenderKey(key => key + 1);
    }
  }, [open]);

  // Fetch user's nickname
  useEffect(() => {
    if (!user) return;
    const fetchNickname = async () => {
      const { data } = await supabase.from('profiles').select('nickname').eq('user_id', user.id).single();
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
          await supabase.from('confession_drafts').update({
            content: content.trim(),
            category,
            image_url: imageUrl
          }).eq('id', currentDraftId);
        } else {
          const { data } = await supabase.from('confession_drafts').insert({
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

  const categories = [
    { value: 'relationships', label: t.category_relationships },
    { value: 'work', label: t.category_work },
    { value: 'family', label: t.category_family },
    { value: 'health', label: t.category_health },
    { value: 'money', label: t.category_money },
    { value: 'other', label: t.category_other }
  ];

  // Image upload handlers
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t.image_invalid_file,
        description: t.image_invalid_file_desc,
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t.image_too_large,
        description: t.image_invalid_file_desc,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('confession-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('confession-images')
        .getPublicUrl(data.path);

      setPreview(publicUrl);
      setImageUrl(publicUrl);

      toast({
        title: t.image_added,
        description: t.image_upload_error,
      });
    } catch (error) {
      logError('Error uploading image', error instanceof Error ? error : undefined);
      toast({
        title: t.common_error,
        description: t.image_upload_error,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Polish confession handler
  const handlePolish = async () => {
    if (!content || content.trim().length === 0) {
      toast({
        title: t.error_generic,
        description: t.polish_empty_error,
        variant: "destructive",
      });
      return;
    }

    setIsPolishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('polish-confession', {
        body: { 
          confessionText: content.trim(),
          language 
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: t.error_generic,
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (data.polishedText) {
        setContent(data.polishedText);
        toast({
          title: t.polish_success_title,
          description: t.polish_success_description,
        });
      }
    } catch (error) {
      logError('Error polishing confession', error as Error);
      toast({
        title: t.error_generic,
        description: t.polish_error,
        variant: "destructive",
      });
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSubmit = async () => {
    if (!canPost) {
      toast({
        title: t.error_generic,
        description: dailyLimit !== Infinity ? t.limit_confessions_remaining.replace('{count}', '0') : t.error_submit,
        variant: "destructive"
      });
      setShowUpgradeModal(true);
      return;
    }

    const normalized = normalizeCreateConfessionPayload({
      content,
      category,
      communityId,
      imageUrl,
      isAnonymous,
      aiResponse: aiResponse ?? undefined,
      mood: null,
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
      if (env.features.confessionTurnstileRequired && !captchaToken) {
        toast({
          title: t.error_generic,
          description: t.auth_captcha_failed || "Please complete the CAPTCHA before submitting.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      const { data: moderationData, error: moderationError } = await supabase.functions.invoke('ai-moderation', {
        body: { content, language, captchaToken }
      });

      if (moderationError) {
        logError('Moderation error', moderationError as Error);
      }

      if (moderationData && !moderationData.is_safe) {
        toast({
          title: t.toast_flagged,
          description: moderationData.reason || t.toast_flagged,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      let responseText: string | null = null;
      try {
        const locale = language === 'en' || language === 'es' || language === 'de' ? language as AiLocale : 'en';
        responseText = await getAiReply({
          text: content.trim(),
          isVip,
          locale,
          userId: user.id,
          confessionId: 'temp'
        });
        setAiResponse(responseText);
      } catch (aiError) {
        logError('AI response error', aiError as Error);
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

      await incrementCount();

      setCaptchaToken(null);
      setTurnstileError(false);
      setCaptchaRenderKey(key => key + 1);

      if (currentDraftId) {
        await supabase.from('confession_drafts').delete().eq('id', currentDraftId);
      }

      // Reset form fields but keep modal open to display AI response
      setContent("");
      setCategory("other");
      setImageUrl(null);
      setPreview(null);
      setCurrentDraftId(null);

      toast({
        title: t.success_sent,
        description: responseText ? t.ai_reply_title : undefined
      });

      // Notify parent about the new confession
      onConfessionCreated();
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
  const costLabel = t.polish_costs_coins || "10 coins";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border-primary/20 rounded-3xl shadow-2xl"
        style={{
          marginBottom: isKeyboardVisible ? `${keyboardHeight}px` : '0',
          transition: 'margin-bottom 0.3s ease-out'
        }}
      >
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-center">
            <DialogTitle className="text-xl font-bold text-foreground text-center">
              {t.new_confession}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {user && (
            <DraftManager 
              userId={user.id} 
              onSelectDraft={draft => {
                setContent(draft.content);
                setCategory(draft.category);
                setCurrentDraftId(draft.id);
                if (draft.image_url) {
                  setImageUrl(draft.image_url);
                  setPreview(draft.image_url);
                }
              }} 
            />
          )}

          {/* Main Confession Text Area - Large Glass Card */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background/80 to-primary/5 backdrop-blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-t from-purple-500/20 via-purple-500/10 to-transparent blur-xl pointer-events-none" />
            <Textarea 
              placeholder={t.placeholder_confession} 
              value={content} 
              onChange={e => setContent(e.target.value)} 
              className="relative min-h-[220px] resize-none bg-transparent border border-border/30 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base text-foreground placeholder:text-muted-foreground/60 p-5 rounded-2xl" 
              disabled={isSubmitting} 
            />
          </div>

          {/* Image Preview */}
          {preview && (
            <div className="relative rounded-xl overflow-hidden border border-border/30">
              <OptimizedImage
                src={preview}
                alt={t.ui_image_preview}
                className="w-full h-32 object-cover"
                width={600}
                height={128}
                priority
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleRemoveImage}
                disabled={isSubmitting}
                className="absolute top-2 right-2 h-7 w-7"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isSubmitting || uploading}
          />

          {/* Compact Action Cluster */}
          <div className="space-y-3 bg-gradient-to-br from-purple-500/5 via-background/50 to-purple-500/5 backdrop-blur-sm rounded-xl p-3 border border-purple-500/10">
            {/* Row 1: Category + Add Image */}
            <div className="flex items-center gap-2">
              <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
                <SelectTrigger className="flex-1 h-9 border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 rounded-full text-xs font-medium px-3">
                  <SelectValue placeholder={t.select_category} />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-background/95 backdrop-blur-xl border-purple-500/20">
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="rounded-lg">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || uploading}
                className="h-9 px-3 border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 rounded-full text-xs font-medium gap-1.5 whitespace-nowrap"
              >
                {uploading ? (
                  <>
                    <Upload className="w-3.5 h-3.5 animate-pulse" />
                    {t.image_uploading}
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-3.5 h-3.5" />
                    {t.image_add}
                  </>
                )}
              </Button>
            </div>

            {/* Row 2: Post Anonymously Toggle */}
            <div className="flex items-center justify-between py-2.5 px-1">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="anonymous-toggle" className="text-sm font-semibold cursor-pointer text-foreground">
                  {t.confession_anonymous_label}
                </Label>
                <span className="text-xs text-muted-foreground/80">
                  {isAnonymous ? t.confession_posting_as_anonymous : (userNickname ? t.confession_anonymous_preview.replace('{name}', userNickname) : t.confession_posting_as_user)}
                </span>
              </div>
              <Switch 
                id="anonymous-toggle" 
                checked={isAnonymous} 
                onCheckedChange={setIsAnonymous} 
                disabled={isSubmitting} 
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-600 data-[state=checked]:to-purple-500 data-[state=checked]:shadow-lg data-[state=checked]:shadow-purple-500/30 data-[state=unchecked]:bg-muted-foreground/30" 
              />
            </div>

            {/* Row 3: Enhance with AI */}
            <button
              type="button"
              onClick={handlePolish}
              disabled={isSubmitting || isPolishing || !content?.trim()}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-lg",
                "bg-background/30 hover:bg-background/50 border border-border/30",
                "transition-all duration-200",
                (isSubmitting || isPolishing || !content?.trim()) && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20">
                  {isPolishing ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {isPolishing ? t.polishing : (t.polish_enhance_ai || t.polish_confession)}
                  </span>
                  <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    {costLabel}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* AI Response Display */}
          {aiResponse && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/20 via-purple-800/10 to-blue-900/20 backdrop-blur-md border border-purple-500/30 shadow-xl shadow-purple-500/10 animate-slide-up">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
              <div className="relative p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-400/20">
                    <Sparkles className="w-4 h-4 text-purple-400 animate-pulse-glow" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-purple-200">{t.ai_reply_title}</h3>
                    <p className="text-xs text-purple-300/60">AI-powered support</p>
                  </div>
                </div>
                <div className="bg-black/20 rounded-xl p-4 border border-purple-500/10">
                  <p className="text-sm text-purple-100/90 leading-relaxed">
                    {aiResponse}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAiResponse(null);
                      onOpenChange(false);
                    }}
                    className="h-9 px-4 rounded-full text-xs font-semibold text-purple-200 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-400/30 transition-all"
                  >
                    {t.common_close || t.ui_close || 'Close'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Turnstile CAPTCHA */}
          {env.features.confessionTurnstileRequired && (
            <div className="space-y-2">
              {turnstileError && (
                <p className="text-xs text-destructive">{t.auth_captcha_failed || 'CAPTCHA failed, please try again.'}</p>
              )}
              <Turnstile 
                key={captchaRenderKey} 
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"} 
                onSuccess={token => {
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
                  size: 'normal'
                }} 
              />
            </div>
          )}

          {/* Primary CTA - Post Confession */}
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
      </DialogContent>
      
      <CrisisDialog isOpen={showCrisisDialog} onClose={() => setShowCrisisDialog(false)} />
    </Dialog>
  );
};

export default NewConfessionDialog;

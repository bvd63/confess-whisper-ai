import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PostAnonymousSwitch } from "@/components/ui/PostAnonymousSwitch";
import { Loader2, Send, Coins, ChevronRight, Image as ImageIcon, X, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useModerationStatus } from "@/hooks/useModerationStatus";
import { useConfessionLimits } from "@/hooks/useConfessionLimits";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { getAiReply, type AiLocale } from "@/services/aiService";
import { supabase } from "@/integrations/supabase/client";
import { env } from "@/lib/env";
import { Turnstile } from "@marsidev/react-turnstile";
import { z } from "zod";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { normalizeCreateConfessionPayload } from "../../supabase/functions/create-confession/utils";
import { CrisisDialog } from "@/components/CrisisDialog";
import { useMobileKeyboard } from "@/hooks/useMobileKeyboard";
import { cn } from "@/lib/utils";

const confessionSchema = z.object({
  content: z.string().trim().min(10, {
    message: "Confession must be at least 10 characters",
  }).max(2000, {
    message: "Confession cannot exceed 2000 characters",
  }),
});

const isFunctionInvokeError = (value: unknown): value is { status?: number; message?: string } =>
  typeof value === "object" && value !== null && ("status" in value || "message" in value);

const Compose = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialCommunityId = (location.state as { communityId?: string })?.communityId ?? null;

  const { toast } = useToast();
  const { language, t } = useLanguage();
  const { user } = useCurrentUser();
  const { checkForCrisis } = useModerationStatus();
  const { canPost, dailyLimit, remaining, incrementCount } = useConfessionLimits();
  const { subscriptionTier } = useVipStatus(user?.id || null);
  const isVip = subscriptionTier === "vip";
  const { isKeyboardVisible, keyboardHeight } = useMobileKeyboard();

  const [content, setContent] = useState("");
  const [category, setCategory] = useState("other");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const [captchaRenderKey, setCaptchaRenderKey] = useState(0);
  const [showCrisisDialog, setShowCrisisDialog] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [showEnhanceDialog, setShowEnhanceDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhance with AI confirmation card copy
  const enhanceModalCopy = useMemo(() => {
    const copyByLang = {
      en: {
        title: "Enhance with AI",
        subtitle: "Preview quick improvements before posting.",
        bullets: [
          "Polishes wording while keeping your intent clear",
          "Keeps tone empathetic and respectful",
          "Quick suggestions without revealing identity",
        ],
        cost: "Cost: 10 coins",
        cancel: "Cancel",
        confirm: "Confirm",
      },
      es: {
        title: "Mejorar con IA",
        subtitle: "Revisa mejoras rápidas antes de publicar.",
        bullets: [
          "Pulimos el texto sin perder tu intención",
          "Mantenemos un tono empático y respetuoso",
          "Sugerencias rápidas sin revelar tu identidad",
        ],
        cost: "Costo: 10 monedas",
        cancel: "Cancelar",
        confirm: "Confirmar",
      },
      de: {
        title: "Mit KI verfeinern",
        subtitle: "Sieh dir schnelle Verbesserungen vor dem Posten an.",
        bullets: [
          "Formuliert klarer, ohne deine Absicht zu ändern",
          "Hält den Ton einfühlsam und respektvoll",
          "Schnelle Tipps, ohne deine Identität zu zeigen",
        ],
        cost: "Kosten: 10 Münzen",
        cancel: "Abbrechen",
        confirm: "Bestätigen",
      },
    };
    return copyByLang[language] || copyByLang.en;
  }, [language]);

  const categories = useMemo(
    () => [
      { value: "relationships", label: t.category_relationships },
      { value: "work", label: t.category_work },
      { value: "family", label: t.category_family },
      { value: "health", label: t.category_health },
      { value: "money", label: t.category_money },
      { value: "other", label: t.category_other },
    ],
    [t],
  );

  useEffect(() => {
    if (!user) return;
    const fetchNickname = async () => {
      const { data } = await supabase.from("profiles").select("nickname").eq("user_id", user.id).single();
      if (data?.nickname) {
        setUserNickname(data.nickname);
      }
    };
    fetchNickname();
  }, [user]);

  useEffect(() => {
    if (content.length > 20 && checkForCrisis(content)) {
      setShowCrisisDialog(true);
    }
  }, [content, checkForCrisis]);

  useEffect(() => {
    setAiResponse((current) => (current ? null : current));
  }, [content]);

  const handleClose = () => {
    navigate("/");
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
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

      const fileExt = file.name.split(".").pop();
      const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage.from("confession-images").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("confession-images").getPublicUrl(data.path);
      setPreview(urlData.publicUrl);
      setImageUrl(urlData.publicUrl);

      toast({
        title: t.image_added,
        description: t.image_upload_error,
      });
    } catch (error) {
      logError("Error uploading image", error instanceof Error ? error : undefined);
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
      fileInputRef.current.value = "";
    }
  };

  const handlePolish = async () => {
    if (!content || content.trim().length === 0) {
      toast({
        title: t.error_generic,
        description: t.polish_empty_error,
        variant: "destructive",
      });
      return;
    }

    if (aiResponse) {
      setAiResponse(null);
    }

    setIsPolishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("polish-confession", {
        body: {
          confessionText: content.trim(),
          language,
        },
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
      logError("Error polishing confession", error as Error);
      toast({
        title: t.error_generic,
        description: t.polish_error,
        variant: "destructive",
      });
    } finally {
      setIsPolishing(false);
    }
  };

  const handleGenerateAiResponse = async () => {
    if (!canPost) {
      toast({
        title: t.error_generic,
        description: dailyLimit !== Infinity ? t.limit_confessions_remaining.replace("{count}", "0") : t.error_submit,
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: t.error_generic,
        description: t.polish_empty_error,
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingResponse(true);
    try {
      const { data: moderationData, error: moderationError } = await supabase.functions.invoke("ai-moderation", {
        body: { content, language, captchaToken },
      });
      if (moderationError) {
        logError("Moderation error", moderationError as Error);
      }
      if (moderationData && !moderationData.is_safe) {
        toast({
          title: t.toast_flagged,
          description: moderationData.reason || t.toast_flagged,
          variant: "destructive",
        });
        return;
      }

      const locale: AiLocale = language === "en" || language === "es" || language === "de" ? (language as AiLocale) : "en";
      const responseText = await getAiReply({
        text: content.trim(),
        isVip,
        locale,
        userId: user?.id || "anonymous",
        confessionId: "temp",
      });

      if (!responseText) {
        toast({
          title: t.error_generic,
          description: t.error_submit,
          variant: "destructive",
        });
        return;
      }

      setAiResponse(responseText);
    } catch (error) {
      logError("Error generating AI response", error as Error);
      toast({
        title: t.error_generic,
        description: t.error_submit,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  const handlePostConfession = async () => {
    if (!canPost) {
      toast({
        title: t.error_generic,
        description: dailyLimit !== Infinity ? t.limit_confessions_remaining.replace("{count}", "0") : t.error_submit,
        variant: "destructive",
      });
      return;
    }

    if (!aiResponse) {
      toast({
        title: t.error_generic,
        description: t.error_submit,
        variant: "destructive",
      });
      return;
    }

    const normalized = normalizeCreateConfessionPayload({
      content,
      category,
      communityId: initialCommunityId,
      imageUrl,
      isAnonymous,
      aiResponse,
      mood: null,
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
    logInfo("Confession payload normalized", {
      contentLength: normalizedPayload.contentLength,
      category: normalizedPayload.category,
      isAnonymous: normalizedPayload.isAnonymous,
      hasCaptchaToken: Boolean(normalizedPayload.captchaToken),
    });

    setIsPosting(true);
    try {
      if (env.features.confessionTurnstileRequired && !captchaToken) {
        toast({
          title: t.error_generic,
          description: t.auth_captcha_failed || "Please complete the CAPTCHA before submitting.",
          variant: "destructive",
        });
        return;
      }

      const { data: moderationData, error: moderationError } = await supabase.functions.invoke("ai-moderation", {
        body: { content, language, captchaToken },
      });
      if (moderationError) {
        logError("Moderation error", moderationError as Error);
      }
      if (moderationData && !moderationData.is_safe) {
        toast({
          title: t.toast_flagged,
          description: moderationData.reason || t.toast_flagged,
          variant: "destructive",
        });
        return;
      }

      if (!user) {
        toast({
          title: t.error_auth,
          description: t.error_auth,
          variant: "destructive",
        });
        return;
      }

      const creationResponse = await supabase.functions.invoke("create-confession", {
        body: {
          ...normalizedPayload,
          aiResponse,
        },
      });

      if (creationResponse.error) {
        const rawError = creationResponse.error;
        const errorStatus = isFunctionInvokeError(rawError) && typeof rawError.status === "number" ? rawError.status : 400;
        let messageKey: string | undefined;
        let serverMessage = isFunctionInvokeError(rawError) && typeof rawError.message === "string" ? rawError.message : undefined;

        if (serverMessage) {
          try {
            const parsed = JSON.parse(serverMessage);
            messageKey = parsed?.messageKey ?? messageKey;
            serverMessage = parsed?.message || serverMessage;
          } catch (parseError) {
            logWarn("Failed to parse confession creation error payload", { error: parseError });
          }
        }

        const responsePayload = creationResponse.data as { messageKey?: string; message?: string } | undefined;
        if (!messageKey && typeof responsePayload?.messageKey === "string") {
          messageKey = responsePayload.messageKey;
        }
        if (!serverMessage && typeof responsePayload?.message === "string") {
          serverMessage = responsePayload.message;
        }

        const translationKey = messageKey?.replace(/\./g, "_");
        const localizedMessage = translationKey && translationKey in t ? (t[translationKey as keyof typeof t] as string) : undefined;
        const fallbackMessage = localizedMessage || serverMessage || t.error_submit;

        if (errorStatus === 429 || messageKey === "common.rate_limit") {
          toast({
            title: t.rate_limit_title || t.error_generic,
            description: localizedMessage || t.common_rate_limit || serverMessage || t.error_submit,
            variant: "destructive",
          });
        } else if (errorStatus === 403 || messageKey === "auth.captcha_failed") {
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

      await incrementCount();

      setCaptchaToken(null);
      setTurnstileError(false);
      setCaptchaRenderKey((key) => key + 1);

      const responseForToast = aiResponse;
      toast({
        title: t.success_sent,
        description: responseForToast ? t.ai_reply_title : undefined,
      });

      setContent("");
      setCategory("other");
      setImageUrl(null);
      setPreview(null);
      setAiResponse(null);
    } catch (error) {
      logError("Error submitting confession", error as Error);
      toast({
        title: t.error_generic,
        description: t.error_submit,
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const quotaHelperText = dailyLimit === Infinity
    ? t.limit_confessions_unlimited
    : t.limit_confessions_remaining.replace("{count}", remaining.toString());
  const isDraft = !aiResponse;
  const isBusy = isGeneratingResponse || isPosting;
  const primaryLabel = isDraft
    ? t.compose_get_ai_response || "Get AI response"
    : t.post_confession || t.submit;
  const isPrimaryLoading = isDraft ? isGeneratingResponse : isPosting;
  const primaryDisabled = isDraft
    ? isBusy || isPolishing || !content.trim() || !canPost || (dailyLimit !== Infinity && remaining === 0)
    : isBusy || isPolishing || !content.trim() || !canPost || (dailyLimit !== Infinity && remaining === 0) || (env.features.confessionTurnstileRequired && !captchaToken);
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#0f0a23] via-[#0a0f2e] to-[#12072d] text-foreground"
    >
      <div className="max-w-[480px] mx-auto px-4 sm:px-6 pt-6 pb-10 space-y-5">
        <div className="flex items-center justify-center relative">
          <h1 className="text-xl font-semibold text-center tracking-tight text-white drop-shadow-lg">
            {t.new_confession}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="absolute right-0 h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 text-white/80"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative rounded-[28px] overflow-hidden shadow-[0_25px_80px_rgba(78,46,176,0.35)]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 blur-[1px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,77,255,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(76,201,240,0.18),transparent_30%),radial-gradient(circle_at_40%_80%,rgba(255,107,107,0.1),transparent_35%)]" />
          <Textarea
            placeholder={t.placeholder_confession}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="relative min-h-[260px] resize-none bg-white/5 backdrop-blur-lg border border-white/10 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0 text-base text-white placeholder:text-white/60 p-6 rounded-[28px] shadow-inner"
            disabled={isBusy}
          />
        </div>

        {preview && (
          <div className="relative rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm">
            <img src={preview} alt={t.ui_image_preview} className="w-full h-40 object-cover" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemoveImage}
              disabled={isBusy}
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/60"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isBusy || uploading}
        />

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-3 shadow-[0_18px_60px_rgba(40,22,82,0.45)]">
          <div className="flex items-center gap-2">
            <Select value={category} onValueChange={setCategory} disabled={isBusy}>
              <SelectTrigger className="flex-1 h-10 rounded-full text-xs font-medium px-3 bg-white/5 border-white/15 text-white">
                <SelectValue placeholder={t.select_category} />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-background/95 backdrop-blur-xl border-white/10">
                {categories.map((cat) => (
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
              disabled={isBusy || uploading}
              className="h-10 px-3 rounded-full text-xs font-medium gap-1.5 whitespace-nowrap border-white/20 bg-white/5 text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
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

          {/* Premium anonymous toggle */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="anonymous-toggle" className="text-sm font-semibold cursor-pointer text-white">
                {t.confession_anonymous_label}
              </Label>
              <span className="text-xs text-white/70">
                {isAnonymous
                  ? t.confession_posting_as_anonymous
                  : userNickname
                    ? t.confession_anonymous_preview.replace("{name}", userNickname)
                    : t.confession_posting_as_user}
              </span>
            </div>
            <PostAnonymousSwitch
              id="anonymous-toggle"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
              disabled={isBusy}
            />
          </div>

          {/* Enhance with AI row - opens confirmation dialog */}
          <button
            type="button"
            onClick={() => setShowEnhanceDialog(true)}
            disabled={isBusy || isPolishing || !content?.trim()}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-full",
              "bg-gradient-to-r from-primary/20 via-white/10 to-accent/20 border border-white/10 backdrop-blur-md",
              "shadow-[0_12px_30px_rgba(78,46,176,0.25)] hover:shadow-[0_16px_40px_rgba(78,46,176,0.3)]",
              "transition-all duration-300",
              (isBusy || isPolishing || !content?.trim()) && "opacity-50 cursor-not-allowed",
            )}
          >
            <div className="flex items-center gap-3">
              {isPolishing ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <span className="text-lg">✨</span>
              )}
              <span className="text-sm font-semibold text-white">{t.polish_enhance_ai}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {aiResponse && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-accent/10 backdrop-blur-md border border-white/15 shadow-[0_16px_50px_rgba(78,46,176,0.35)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,77,255,0.15),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(76,201,240,0.12),transparent_30%)]" />
            <div className="relative p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/15">
                  <span className="text-lg">✨</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{t.ai_reply_title}</h3>
                  <p className="text-xs text-white/70">AI-powered support</p>
                </div>
              </div>
              <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line">{aiResponse}</p>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAiResponse(null)}
                  className="h-9 px-4 rounded-full text-xs font-semibold text-white hover:bg-white/10"
                >
                  {t.common_close || t.ui_close || "Close"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {env.features.confessionTurnstileRequired && (
          <div className="space-y-2">
            {turnstileError && (
              <p className="text-xs text-destructive">{t.auth_captcha_failed || "CAPTCHA failed, please try again."}</p>
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
                theme: "auto",
                size: "normal",
              }}
            />
          </div>
        )}

        {/* Post Confession button - static, no shimmer/animation */}
        <div className="space-y-2">
          <Button
            onClick={isDraft ? handleGenerateAiResponse : handlePostConfession}
            disabled={primaryDisabled}
            className="w-full h-14 rounded-full font-semibold text-base bg-gradient-to-r from-primary to-accent text-white shadow-[0_18px_50px_rgba(78,46,176,0.35)] border border-white/10 transition-none"
          >
            {isPrimaryLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t.submitting}
              </>
            ) : (
              <>
                {isDraft ? <Sparkles className="w-5 h-5 mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                {primaryLabel}
              </>
            )}
          </Button>
          <p className="text-center text-xs text-white/60">{quotaHelperText}</p>
        </div>
      </div>

      <CrisisDialog isOpen={showCrisisDialog} onClose={() => setShowCrisisDialog(false)} />

      {/* Enhance with AI Confirmation Dialog */}
      <Dialog open={showEnhanceDialog} onOpenChange={setShowEnhanceDialog}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-[#2a2e5c] via-[#19192f] to-[#0d0d1b] border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <span className="text-xl">✨</span>
              {enhanceModalCopy.title}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {enhanceModalCopy.subtitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {enhanceModalCopy.bullets.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3 text-sm text-white/90">
                <span className="text-base leading-none pt-0.5">
                  {index === 0 ? "✨" : index === 1 ? "🔒" : "⚡"}
                </span>
                <span>{benefit}</span>
              </div>
            ))}
            <div className="mt-4 px-4 py-3 rounded-2xl bg-white/10 border border-white/15 flex items-center gap-2 text-sm font-semibold text-white">
              <Coins className="w-4 h-4 text-amber-300" />
              <span>{enhanceModalCopy.cost}</span>
            </div>
          </div>
          <DialogFooter className="flex flex-row gap-3 sm:gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-full border-white/30 bg-white/5 text-white hover:bg-white/10"
              onClick={() => setShowEnhanceDialog(false)}
              disabled={isPolishing}
            >
              {enhanceModalCopy.cancel}
            </Button>
            <Button
              className="flex-1 rounded-full bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground"
              onClick={() => {
                setShowEnhanceDialog(false);
                handlePolish();
              }}
              disabled={isBusy || isPolishing || !content?.trim()}
            >
              {isPolishing ? t.submitting : enhanceModalCopy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Compose;

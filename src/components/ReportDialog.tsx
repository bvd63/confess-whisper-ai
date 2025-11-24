import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { logWarn, logError } from "@/lib/logger";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confessionId: string;
  userId: string | null;
}

const MAX_DETAILS_LENGTH = 1000;

const ReportDialog = ({ open, onOpenChange, confessionId, userId }: ReportDialogProps) => {
  const { t, language } = useLanguage();
  const confirm = useConfirm();
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  const reportReasons = [
    { value: 'spam', label: t.report_reason_spam },
    { value: 'harassment', label: t.report_reason_harassment },
    { value: 'hate_speech', label: t.report_reason_hate_speech },
    { value: 'violence', label: t.report_reason_violence },
    { value: 'adult_content', label: t.report_reason_adult_content },
    { value: 'misinformation', label: t.report_reason_misinformation },
    { value: 'personal_info', label: t.report_reason_personal_info },
    { value: 'other', label: t.report_reason_other },
  ];

  const handleSubmit = async () => {
    if (!userId) {
      toast({
        title: t.auth_error,
        description: t.auth_error_generic,
        variant: "destructive",
      });
      return;
    }

    if (!selectedReason) {
      toast({
        title: t.common_error,
        description: t.report_select_reason_error,
        variant: "destructive",
      });
      return;
    }

    // Ask for confirmation before submitting the report
    const confirmed = await confirm({
      titleKey: 'confirm.reportContent.title',
      messageKey: 'confirm.reportContent.message',
      variant: 'warning',
    });
    
    if (!confirmed) return;

    setSubmitting(true);

    try {
      const response = await supabase.functions.invoke('report-confession', {
        body: {
          confessionId,
          reason: selectedReason,
          details: details.trim() || undefined,
          language,
        },
      });

      if (response.error) {
        const status = typeof response.error.status === 'number' ? response.error.status : 400;
        const rawMessage = typeof response.error.message === 'string' ? response.error.message : undefined;
        let parsed: { messageKey?: string; retryAfter?: number } | null = null;

        if (rawMessage) {
          try {
            parsed = JSON.parse(rawMessage);
          } catch (parseError) {
            logWarn('Failed to parse report-confession error payload', { parseError });
          }
        }

        if (status === 409 || (rawMessage && rawMessage.includes('ALREADY_REPORTED'))) {
          toast({
            title: t.report_already_reported_title,
            description: t.report_already_reported_desc,
            variant: "destructive",
          });
          return;
        }

        if (status === 429 || parsed?.messageKey === 'common.rate_limit') {
          toast({
            title: t.rate_limit_title,
            description: t.common_rate_limit,
            variant: "destructive",
          });
          return;
        }

        if (status === 401) {
          toast({
            title: t.auth_error,
            description: t.auth_error_generic,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: t.common_error,
          description: t.report_submit_error_desc,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t.success_reported,
        description: t.report_submit_success_desc,
      });

      onOpenChange(false);
      setSelectedReason("");
      setDetails("");
    } catch (error) {
      logError('Error submitting report', error as Error);
      toast({
        title: t.common_error,
        description: t.report_submit_error_desc,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl text-foreground">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
            🚨 {t.report_title}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            ⚠️ {t.report_description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-xs sm:text-sm font-semibold">{t.report_reason_label}</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {reportReasons.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label
                    htmlFor={reason.value}
                    className="text-xs sm:text-sm font-normal cursor-pointer"
                  >
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details" className="text-xs sm:text-sm font-semibold">
              {t.report_details_label}
            </Label>
            <Textarea
              id="details"
              placeholder={t.report_details_placeholder}
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, MAX_DETAILS_LENGTH))}
              className="min-h-[80px] sm:min-h-[100px] text-xs sm:text-sm"
              disabled={submitting}
              maxLength={MAX_DETAILS_LENGTH}
            />
            <div className="flex justify-end text-[10px] sm:text-xs text-muted-foreground">
              {details.length}/{MAX_DETAILS_LENGTH}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="flex-1 text-xs sm:text-sm rounded-lg h-10 border-border hover:bg-accent"
              size="sm"
            >
              ❌ {t.moderation_cancel}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedReason}
              variant="destructive"
              className="flex-1 text-xs sm:text-sm rounded-lg h-10 font-semibold"
              size="sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                  ⏳ {t.report_submitting}
                </>
              ) : (
                <>🚨 {t.report_submit_button}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;

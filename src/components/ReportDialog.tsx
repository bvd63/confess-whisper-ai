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

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confessionId: string;
  userId: string | null;
}

const ReportDialog = ({ open, onOpenChange, confessionId, userId }: ReportDialogProps) => {
  const { t } = useLanguage();
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

    setSubmitting(true);

    try {
      // Check if already reported
      const { data: existing } = await supabase
        .from('confession_reports')
        .select('id')
        .eq('confession_id', confessionId)
        .eq('reporter_id', userId)
        .maybeSingle();

      if (existing) {
        toast({
          title: t.report_already_reported_title,
          description: t.report_already_reported_desc,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Create report
      const { error: reportError } = await supabase
        .from('confession_reports')
        .insert({
          confession_id: confessionId,
          reporter_id: userId,
          reason: selectedReason,
          details: details.trim() || null,
        });

      if (reportError) throw reportError;

      // Mark confession as reported
      const { error: updateError } = await supabase
        .from('confessions')
        .update({ is_reported: true })
        .eq('id', confessionId);

      if (updateError) throw updateError;

      toast({
        title: t.success_reported,
        description: t.report_submit_success_desc,
      });

      onOpenChange(false);
      setSelectedReason("");
      setDetails("");
    } catch (error) {
      console.error('Error submitting report:', error);
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
            {t.report_title}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {t.report_description}
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
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-[80px] sm:min-h-[100px] text-xs sm:text-sm"
              disabled={submitting}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="flex-1 text-xs sm:text-sm"
              size="sm"
            >
              {t.moderation_cancel}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedReason}
              variant="destructive"
              className="flex-1 text-xs sm:text-sm"
              size="sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                  {t.report_submitting}
                </>
              ) : (
                t.report_submit_button
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;

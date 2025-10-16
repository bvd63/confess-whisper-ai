import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
    { value: 'spam', label: 'Spam or advertising' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'hate_speech', label: 'Hate speech' },
    { value: 'violence', label: 'Violence or threats' },
    { value: 'adult_content', label: 'Adult content' },
    { value: 'misinformation', label: 'Misinformation' },
    { value: 'personal_info', label: 'Personal information' },
    { value: 'other', label: 'Other' },
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
        description: "Please select a reason",
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
          title: "Already reported",
          description: "You already reported this confession",
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
        description: "Thank you for your report. Our team will investigate.",
      });

      onOpenChange(false);
      setSelectedReason("");
      setDetails("");
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: t.common_error,
        description: "Could not submit report",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {t.report_title}
          </DialogTitle>
          <DialogDescription>
            {t.report_description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t.report_reason_label}</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {reportReasons.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label
                    htmlFor={reason.value}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details" className="text-sm font-semibold">
              Additional details (optional)
            </Label>
            <Textarea
              id="details"
              placeholder="Provide more details about the issue..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-[100px]"
              disabled={submitting}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedReason}
              variant="destructive"
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit report'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;

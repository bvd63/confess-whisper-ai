import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { EnhancedSubscriptionManager } from "./EnhancedSubscriptionManager";

interface ManageSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscriptionUpdated?: () => void;
}

export const ManageSubscriptionDialog = ({ open, onOpenChange, onSubscriptionUpdated }: ManageSubscriptionDialogProps) => {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.subscription_title}</DialogTitle>
        </DialogHeader>
        <EnhancedSubscriptionManager />
      </DialogContent>
    </Dialog>
  );
};

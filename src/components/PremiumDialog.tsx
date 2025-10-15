import SubscriptionPlans from "./SubscriptionPlans";

interface PremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
}

const PremiumDialog = ({ open, onOpenChange }: PremiumDialogProps) => {
  return <SubscriptionPlans open={open} onOpenChange={onOpenChange} />;
};

export default PremiumDialog;

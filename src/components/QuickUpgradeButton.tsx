import { Button } from "@/components/ui/button";
import { Crown, Zap, Sparkles } from "lucide-react";
import { useSubscription } from "@/state/SubscriptionProvider";
import { useState } from "react";
import { ManageSubscriptionDialog } from "./ManageSubscriptionDialog";
import { cn } from "@/lib/utils";

interface QuickUpgradeButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  customText?: string;
}

export const QuickUpgradeButton = ({ 
  variant = 'default',
  size = 'default',
  className,
  showIcon = true,
  customText
}: QuickUpgradeButtonProps) => {
  const { subscriptionTier, isLoading } = useSubscription();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Don't show for VIP users
  if (isLoading || subscriptionTier === 'vip') {
    return null;
  }

  const config = {
    icon: Crown,
    text: customText || 'Upgrade to VIP',
    gradient: 'from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400'
  };

  const Icon = config.icon;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setDialogOpen(true)}
        className={cn(
          variant === 'default' && `bg-gradient-to-r ${config.gradient} text-white border-0`,
          'gap-2 animate-in fade-in zoom-in duration-300',
          className
        )}
      >
        {showIcon && <Icon className="w-4 h-4" />}
        {config.text}
        <Sparkles className="w-3 h-3 ml-1 opacity-75" />
      </Button>

      <ManageSubscriptionDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubscriptionUpdated={() => {}}
      />
    </>
  );
};

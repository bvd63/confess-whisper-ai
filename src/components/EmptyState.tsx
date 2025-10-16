import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}
const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}: EmptyStateProps) => {
  return <Card className="p-12 text-center bg-gradient-to-br from-card to-muted/20 border-border/50 animate-fade-in px-[46px] py-[13px]">
      <div className="inline-flex p-6 rounded-full bg-primary/10 mb-6">
        <Icon className="w-12 h-12 text-primary" />
      </div>
      
      <h3 className="text-2xl font-bold text-foreground mb-3">
        {title}
      </h3>
      
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {description}
      </p>
      
      {actionLabel && onAction && <Button onClick={onAction} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
          {actionLabel}
        </Button>}
    </Card>;
};
export default EmptyState;
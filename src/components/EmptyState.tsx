import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) => {
  return (
    <Card 
      className={cn(
        "p-8 sm:p-12 text-center animate-fade-in",
        "bg-gradient-to-br from-card via-card to-muted/20",
        "border-border/50",
        className
      )}
    >
      <div className="inline-flex p-6 rounded-full bg-primary/10 mb-6 animate-bounce-subtle">
        <Icon className="w-12 h-12 text-primary" />
      </div>
      
      <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
        {title}
      </h3>
      
      <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-md mx-auto">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          size="lg"
          className="hover-lift"
        >
          {actionLabel}
        </Button>
      )}
    </Card>
  );
};

export default EmptyState;
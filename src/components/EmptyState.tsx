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
        "p-6 sm:p-8 md:p-12 text-center animate-fade-in",
        "bg-gradient-to-br from-card via-card to-muted/20",
        "border-border/50",
        className
      )}
    >
      <div className="inline-flex p-4 sm:p-5 rounded-full bg-primary/10 mb-4 sm:mb-5 animate-bounce-subtle">
        <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
      </div>
      
      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-2 sm:mb-3">
        {title}
      </h3>
      
      <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
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
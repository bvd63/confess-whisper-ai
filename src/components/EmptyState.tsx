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
        "p-8 sm:p-10 md:p-14 text-center animate-fade-in rounded-3xl shadow-card",
        "bg-gradient-to-br from-card via-muted/10 to-card",
        "border-border/50",
        className
      )}
    >
      <div className="inline-flex p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 mb-5 sm:mb-6 shadow-ios animate-pulse">
        <Icon className="w-12 h-12 sm:w-14 sm:h-14 text-primary" />
      </div>
      
      <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4">
        {title}
      </h3>
      
      <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed font-medium">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          size="lg"
          className="h-12 sm:h-14 px-8 rounded-2xl shadow-elevated hover:shadow-ios text-base font-bold"
        >
          {actionLabel}
        </Button>
      )}
    </Card>
  );
};

export default EmptyState;
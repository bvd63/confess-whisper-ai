import { Button } from "@/components/ui/button";
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
    <div 
      className={cn(
        "flex flex-col items-center justify-center py-16 sm:py-24 px-6 animate-fade-in",
        className
      )}
    >
      <div className="flex items-center justify-center mb-6">
        <Icon className="w-12 h-12 sm:w-14 sm:h-14 text-white/20" />
      </div>
      
      <h3 className="text-lg sm:text-xl font-semibold text-white/90 mb-2">
        {title}
      </h3>
      
      <p className="text-sm sm:text-base text-white/50 max-w-sm mx-auto text-center leading-relaxed">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          size="lg"
          className="mt-8 hover-lift"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
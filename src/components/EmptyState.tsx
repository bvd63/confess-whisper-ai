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
        "flex flex-col items-center justify-center min-h-[60vh] px-6 animate-fade-in",
        className
      )}
    >
      {/* Icon with soft glass circle and ambient glow */}
      <div className="relative mb-8">
        {/* Ambient glow layer */}
        <div className="absolute inset-0 blur-3xl opacity-30">
          <div className="w-32 h-32 rounded-full bg-gradient-to-r from-primary to-accent" />
        </div>
        
        {/* Glass circle container */}
        <div className="relative flex items-center justify-center w-32 h-32 rounded-full bg-white/[0.03] backdrop-blur-md border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <Icon className="w-12 h-12 text-white/40" strokeWidth={1.5} />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-white/95 mb-3 tracking-tight">
        {title}
      </h3>
      
      <p className="text-[15px] text-white/50 max-w-xs mx-auto text-center leading-relaxed">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          size="lg"
          className="mt-10 hover-lift"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
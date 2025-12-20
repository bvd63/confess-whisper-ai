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
        // Negative margins to break out of parent container padding
        "-mx-6 -my-6",
        // Full-screen centered layout
        "flex flex-col items-center justify-center min-h-[70vh] px-6 py-12",
        "animate-fade-in",
        className
      )}
    >
      {/* Icon with soft glass circle and ambient glow */}
      <div className="relative mb-8">
        {/* Ambient glow layer - using primary gradient from "Get AI response" */}
        <div className="absolute inset-0 -z-10 blur-3xl opacity-30 scale-150">
          <div className="w-40 h-40 rounded-full bg-gradient-to-r from-primary to-accent" />
        </div>
        
        {/* Glass circle container */}
        <div className="relative flex items-center justify-center w-40 h-40 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.15] shadow-[0_20px_70px_rgba(124,58,237,0.3)]">
          <Icon className="w-16 h-16 text-white/60" strokeWidth={1.5} />
        </div>
      </div>
      
      <h3 className="text-2xl font-semibold text-white/95 mb-4 tracking-tight">
        {title}
      </h3>
      
      <p className="text-base text-white/60 max-w-sm mx-auto text-center leading-relaxed">
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
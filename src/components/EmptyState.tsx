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
        // Fullscreen centered layout - break out of parent constraints
        "absolute inset-0 flex flex-col items-center justify-center",
        "bg-transparent",
        "animate-fade-in",
        className
      )}
    >
      {/* Icon with 3D glass sphere and ambient glow */}
      <div className="relative mb-10">
        {/* Bottom ambient glow - subtle purple reflection */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-28 h-8 rounded-full bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40 blur-xl opacity-60" />
        
        {/* Glass sphere container */}
        <div className="relative flex items-center justify-center w-32 h-32 rounded-full">
          {/* Outer glass ring - creates 3D depth */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent" />
          <div className="absolute inset-0 rounded-full border border-white/[0.08]" />
          
          {/* Inner sphere highlight - top light reflection */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-b from-white/[0.08] to-transparent opacity-60" />
          
          {/* Subtle inner shadow for depth */}
          <div className="absolute inset-0 rounded-full shadow-[inset_0_-20px_40px_rgba(0,0,0,0.3)]" />
          
          <Icon className="w-12 h-12 text-white/50" strokeWidth={1.2} />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-white/90 mb-3 tracking-tight text-center">
        {title}
      </h3>
      
      <p className="text-[15px] text-white/50 max-w-[260px] mx-auto text-center leading-relaxed">
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
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
      {/* Icon with soft glass circle and accent gradient glow */}
      <div className="relative mb-8">
        {/* Accent gradient ambient glow - increased opacity and scale */}
        <div className="absolute -inset-4 blur-3xl opacity-40 scale-150">
          <div className="w-40 h-40 rounded-full bg-gradient-to-r from-primary to-accent" />
        </div>
        
        {/* Glass circle container with gradient border */}
        <div className="relative flex items-center justify-center w-32 h-32 rounded-full bg-white/[0.03] backdrop-blur-md border-2 border-transparent shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
             style={{
               backgroundImage: 'linear-gradient(hsl(var(--background)), hsl(var(--background))), linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)))',
               backgroundOrigin: 'border-box',
               backgroundClip: 'padding-box, border-box'
             }}>
          <Icon className="w-12 h-12 text-white/60" strokeWidth={1.5} />
        </div>
      </div>
      
      {/* Gradient text title */}
      <h3 className="text-xl font-semibold mb-3 tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        {title}
      </h3>
      
      <p className="text-[15px] text-white/50 max-w-xs mx-auto text-center leading-relaxed">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          size="lg"
          className="mt-10 hover-lift bg-gradient-to-r from-primary to-accent text-white"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
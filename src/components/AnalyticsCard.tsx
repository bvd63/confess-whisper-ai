import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
}

const AnalyticsCard = ({ title, value, icon: Icon, description }: AnalyticsCardProps) => {
  return (
    <Card className="p-3 sm:p-4 bg-gradient-to-br from-card to-muted/30 border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-1 sm:space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {value}
          </p>
          {description && (
            <p className="text-[10px] sm:text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="p-2 sm:p-2.5 bg-primary/10 rounded-lg">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </div>
      </div>
    </Card>
  );
};

export default AnalyticsCard;
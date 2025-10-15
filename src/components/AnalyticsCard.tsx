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
    <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </Card>
  );
};

export default AnalyticsCard;
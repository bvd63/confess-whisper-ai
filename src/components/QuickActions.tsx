import { EnhancedButton } from "@/components/EnhancedButton";
import { Plus, Search, MessageCircle, Compass, Users, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface QuickActionsProps {
  className?: string;
  onNewConfession: () => void;
}

/**
 * Quick action buttons for common tasks
 */
export const QuickActions = ({ className, onNewConfession }: QuickActionsProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const actions = [
    {
      icon: Plus,
      label: t.quick_action_new,
      onClick: onNewConfession,
      variant: "default" as const,
    },
    {
      icon: Compass,
      label: t.quick_action_explore,
      onClick: () => navigate("/explore"),
      variant: "outline" as const,
    },
    {
      icon: MessageCircle,
      label: t.quick_action_messages,
      onClick: () => navigate("/messages"),
      variant: "outline" as const,
    },
    {
      icon: Users,
      label: t.quick_action_communities,
      onClick: () => navigate("/communities"),
      variant: "outline" as const,
    },
    {
      icon: MapPin,
      label: t.quick_action_nearby,
      onClick: () => navigate("/nearby"),
      variant: "outline" as const,
    },
    {
      icon: Search,
      label: t.quick_action_search,
      onClick: () => navigate("/search-users"),
      variant: "outline" as const,
    },
  ];

  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      {actions.map((action, index) => (
        <EnhancedButton
          key={action.label}
          variant={action.variant}
          size="sm"
          onClick={action.onClick}
          className="gap-2 animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
          lift={action.variant === "default"}
          glow={action.variant === "default"}
        >
          <action.icon className="w-4 h-4" />
          {action.label}
        </EnhancedButton>
      ))}
    </div>
  );
};

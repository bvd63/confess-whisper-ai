import { Button } from "@/components/ui/button";
import { Plus, Search, MessageCircle, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  className?: string;
  onNewConfession: () => void;
}

/**
 * Quick action buttons for common tasks
 */
export const QuickActions = ({ className, onNewConfession }: QuickActionsProps) => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Plus,
      label: "New",
      onClick: onNewConfession,
      variant: "default" as const,
    },
    {
      icon: Compass,
      label: "Explore",
      onClick: () => navigate("/explore"),
      variant: "outline" as const,
    },
    {
      icon: MessageCircle,
      label: "Messages",
      onClick: () => navigate("/messages"),
      variant: "outline" as const,
    },
    {
      icon: Search,
      label: "Search",
      onClick: () => navigate("/search-users"),
      variant: "outline" as const,
    },
  ];

  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant}
          size="sm"
          onClick={action.onClick}
          className="gap-2"
        >
          <action.icon className="w-4 h-4" />
          {action.label}
        </Button>
      ))}
    </div>
  );
};

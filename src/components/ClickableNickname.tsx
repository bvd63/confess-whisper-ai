import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClickableNicknameProps {
  userId: string;
  nickname?: string | null;
  className?: string;
  showIcon?: boolean;
}

/**
 * Clickable nickname component that navigates to user profile
 */
export const ClickableNickname = ({ 
  userId, 
  nickname, 
  className,
  showIcon = false 
}: ClickableNicknameProps) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/user/${userId}`);
  };

  if (!nickname) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn(
        "h-auto p-1 font-semibold hover:text-primary transition-colors",
        className
      )}
    >
      {showIcon && <User className="w-3 h-3 mr-1" />}
      @{nickname}
    </Button>
  );
};

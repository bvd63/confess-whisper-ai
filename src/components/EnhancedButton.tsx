import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
interface EnhancedButtonProps extends ButtonProps {
  glow?: boolean;
  shine?: boolean;
  lift?: boolean;
}
export const EnhancedButton = ({
  children,
  className,
  glow = false,
  shine = false,
  lift = false,
  ...props
}: EnhancedButtonProps) => {
  return;
};
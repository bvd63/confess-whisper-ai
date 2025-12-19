import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

type PostAnonymousSwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
  thumbClassName?: string;
};

export const PostAnonymousSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  PostAnonymousSwitchProps
>(({ className, thumbClassName, ...props }, ref) => {
  return (
    <SwitchPrimitives.Root
      ref={ref}
      className={cn(
        "inline-flex h-[20px] w-[32px] items-center rounded-full border-0 bg-white/20",
        "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-accent",
        "transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
        className,
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform",
          "translate-x-[2px] data-[state=checked]:translate-x-[14px]",
          thumbClassName,
        )}
      />
    </SwitchPrimitives.Root>
  );
});

PostAnonymousSwitch.displayName = "PostAnonymousSwitch";

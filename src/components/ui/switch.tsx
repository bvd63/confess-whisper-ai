import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      // TRACK — slim, ca în POZA 1
      "peer inline-flex h-[18px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border-0 transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=unchecked]:bg-muted-foreground/30",
      "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-violet-500 data-[state=checked]:to-fuchsia-500",
      className,
    )}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // THUMB — mic, fără bubble
        "pointer-events-none block h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform",
        "data-[state=unchecked]:translate-x-[2px]",
        "data-[state=checked]:translate-x-[20px]",
      )}
    />
  </SwitchPrimitives.Root>
));

Switch.displayName = SwitchPrimitives.Root.displayName;
export { Switch };

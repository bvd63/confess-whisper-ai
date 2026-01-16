import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border/60 bg-card/70 px-3.5 py-2.5 text-base shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
          "backdrop-blur-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground placeholder:transition-opacity placeholder:duration-200",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] focus-visible:placeholder:opacity-60",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

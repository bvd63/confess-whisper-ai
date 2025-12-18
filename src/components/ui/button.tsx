import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground shadow-[0_10px_30px_hsl(var(--primary)/0.28)] hover:shadow-[0_16px_40px_hsl(var(--primary)/0.32)] hover:saturate-[1.05]",
        destructive:
          "border border-transparent bg-destructive text-destructive-foreground shadow-[0_10px_26px_hsl(var(--destructive)/0.28)] hover:bg-destructive/90",
        outline:
          "border border-border/70 bg-card/60 text-foreground backdrop-blur-md shadow-[0_1px_0_hsl(var(--foreground)/0.08)] hover:border-primary/40 hover:bg-card/75",
        secondary:
          "border border-border/60 bg-secondary/80 text-foreground shadow-sm hover:bg-secondary/90",
        ghost: "border border-transparent text-foreground hover:bg-muted/60 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-2xl px-8",
        icon: "h-10 w-10", 
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/**
 * `pointer-coarse:min-h-11` raises every button to a 44px tap target on touch
 * devices while leaving desktop density alone. Height is a floor rather than a
 * fixed size, so the label keeps its own vertical rhythm and nothing reflows on
 * a mouse-driven screen. `link` opts out — an inline text link inside a
 * paragraph must not become a 44px block mid-sentence.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-[var(--dur-fast)] focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-surface-2 text-text hover:bg-border",
        brand: "bg-brand text-bg hover:opacity-90",
        cta: "bg-cta text-cta-fg font-semibold hover:opacity-90 shadow-1",
        outline: "border border-border bg-transparent text-text hover:bg-surface",
        ghost: "bg-transparent text-text hover:bg-surface",
        link: "bg-transparent text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs pointer-coarse:min-h-11",
        md: "h-10 px-4 pointer-coarse:min-h-11",
        lg: "h-12 px-6 text-base",
        icon: "size-10 pointer-coarse:min-h-11 pointer-coarse:min-w-11",
      },
    },
    compoundVariants: [
      // Inline links are text, not controls; a 44px floor would break the line box.
      { variant: "link", class: "pointer-coarse:min-h-0 pointer-coarse:min-w-0" },
    ],
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };

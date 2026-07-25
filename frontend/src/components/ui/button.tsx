import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Primary actions are BRAND VIOLET, in-app and out — the palette is the
   product's identity and it carries the commit action. (An earlier pass made
   in-app primaries ink, on Attio's "don't use colour in primary buttons" rule;
   reverted on the owner's call, who prefers the violet.)

   The two registers still read apart, now by SHAPE rather than hue: in-app
   buttons sit at the system's 10px radius, while `brand` — the single CTA on
   unauthenticated pages — is a gradient pill. Marketing speaks a little
   louder; the app stays square-shouldered.

   Trade-off worth knowing: violet is no longer reserved solely for the rail,
   so the rail now earns its meaning from position and consistency rather than
   from being the only coloured thing on screen.

   `ink` remains available for the rare case where a commit button must not
   compete with brand colour beside it.

   No shadows on any variant. Hairlines separate; only overlays float.
   tailwind-merge drops `bg-*` when a `bg-gradient-to-*` class shares the same
   call, so every gradient below goes through the arbitrary-property form. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 [background-image:linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0))]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/40 [background-image:linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0))]",
        outline: "border border-border bg-background hover:border-(--ds-border-strong) hover:bg-secondary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-(--ds-surface-3)",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        /* Neutral commit action — opt-in, for toolbars where a violet button
           would fight the brand colour already on screen. */
        ink: "bg-ink text-ink-foreground hover:bg-ink/88",
        /* Public register only: the one CTA on an unauthenticated page. */
        brand:
          "rounded-full bg-primary text-primary-foreground [background-image:var(--ds-gradient-brand)] hover:opacity-92",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-11 px-6 text-[15px]",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
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
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

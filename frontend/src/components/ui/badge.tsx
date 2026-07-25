import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Badges are the sharpest shape in the system — 4px, near-square
   (Mezmo). That contrast against the 10px buttons and 8px cards is
   what makes a dense row of status chips read as data rather than as
   more controls. Semantic variants stay tinted; `default` is neutral,
   because most chips in a CRM are labels, not statuses. */
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-badge border px-1.5 py-0.5 text-xs font-medium transition-colors [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-(--ds-text-secondary)",
        primary: "border-transparent bg-accent text-accent-foreground",
        processing: "border-transparent bg-accent text-accent-foreground",
        success: "border-success/25 bg-success/10 text-success",
        warning:
          "border-(--ds-color-warning)/25 bg-(--ds-color-warning-surface) text-(--ds-color-warning)",
        error:
          "border-(--ds-color-error)/25 bg-(--ds-color-error-surface) text-(--ds-color-error)",
        /* Inverted — for a chip that must survive on a dark or busy
           surface (Mezmo "Inverted Badge"). */
        ink: "border-transparent bg-ink text-ink-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };

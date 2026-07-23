import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-colors [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-secondary-foreground",
        primary: "border-transparent bg-accent text-accent-foreground",
        processing: "border-transparent bg-accent text-accent-foreground",
        success: "border-success/25 bg-success/10 text-success",
        warning:
          "border-(--ds-color-warning)/25 bg-(--ds-color-warning-surface) text-(--ds-color-warning)",
        error:
          "border-(--ds-color-error)/25 bg-(--ds-color-error-surface) text-(--ds-color-error)",
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

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Info, CircleCheck, TriangleAlert, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        info: "border-(--ds-color-info)/20 bg-(--ds-color-info-surface) text-(--ds-color-info)",
        success:
          "border-success/25 bg-(--ds-color-success-surface) text-success",
        warning:
          "border-(--ds-color-warning)/25 bg-(--ds-color-warning-surface) text-(--ds-color-warning)",
        error:
          "border-(--ds-color-error)/25 bg-(--ds-color-error-surface) text-(--ds-color-error)",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

const defaultIcons: Record<
  NonNullable<VariantProps<typeof alertVariants>["variant"]>,
  React.ReactNode
> = {
  info: <Info aria-hidden="true" />,
  success: <CircleCheck aria-hidden="true" />,
  warning: <TriangleAlert aria-hidden="true" />,
  error: <CircleAlert aria-hidden="true" />,
};

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Custom leading icon. Pass `null` to render no icon. */
  icon?: React.ReactNode;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, title, description, icon, children, ...props }, ref) => {
    const resolvedIcon =
      icon === undefined ? defaultIcons[variant ?? "info"] : icon;
    return (
      <div
        ref={ref}
        role="alert"
        data-slot="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {resolvedIcon}
        <div className="flex-1 space-y-1 text-start">
          {title != null && (
            <div data-slot="alert-title" className="font-medium leading-snug">
              {title}
            </div>
          )}
          {description != null && (
            <div
              data-slot="alert-description"
              className="leading-relaxed text-foreground/80"
            >
              {description}
            </div>
          )}
          {children}
        </div>
      </div>
    );
  },
);
Alert.displayName = "Alert";

export { Alert, alertVariants };

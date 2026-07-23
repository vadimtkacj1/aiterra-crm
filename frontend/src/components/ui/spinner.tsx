import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const spinnerVariants = cva("animate-spin text-primary", {
  variants: {
    size: {
      sm: "size-4",
      default: "size-5",
      lg: "size-8",
    },
  },
  defaultVariants: { size: "default" },
});

export interface SpinnerProps
  extends Omit<React.SVGAttributes<SVGSVGElement>, "children">,
    VariantProps<typeof spinnerVariants> {
  /** Accessible label announced to screen readers. */
  label?: string;
}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, label, ...props }, ref) => (
    <Loader2
      ref={ref}
      data-slot="spinner"
      role="status"
      aria-label={label}
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    />
  ),
);
Spinner.displayName = "Spinner";

export interface PageSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  /** Accessible label announced to screen readers. */
  label?: string;
}

const PageSpinner = React.forwardRef<HTMLDivElement, PageSpinnerProps>(
  ({ className, size = "lg", label, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="page-spinner"
      className={cn(
        "flex min-h-40 w-full flex-1 items-center justify-center py-10",
        className,
      )}
      {...props}
    >
      <Spinner size={size} label={label} />
    </div>
  ),
);
PageSpinner.displayName = "PageSpinner";

export { Spinner, PageSpinner, spinnerVariants };

import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        /* 7px — inputs are the sharpest control, a notch tighter than
           the 10px buttons beside them (Attio). No shadow: the hairline
           is the field boundary. */
        "flex h-9 w-full rounded-input border border-input bg-background px-3 py-2 text-sm transition-[color,border-color,box-shadow]",
        "placeholder:text-muted-foreground hover:border-(--ds-border-strong)",
        "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };

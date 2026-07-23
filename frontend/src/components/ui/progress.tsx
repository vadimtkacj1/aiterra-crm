import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    data-slot="progress"
    value={value}
    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
    {...props}
  >
    {/* Width-based fill (not translateX) so the bar grows from the
        inline-start edge in both LTR and RTL without direction hacks. */}
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className="h-full rounded-full bg-primary transition-[width] duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };

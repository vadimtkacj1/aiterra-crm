import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyBoxProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

/**
 * Small inline empty-state placeholder for tables and lists.
 * For full-page empty states use the richer shared EmptyState component.
 */
const EmptyBox = React.forwardRef<HTMLDivElement, EmptyBoxProps>(
  ({ icon, title, description, action, className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="empty-box"
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-4 py-8 text-center",
        className,
      )}
      {...props}
    >
      <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5">
        {icon ?? <Inbox aria-hidden="true" />}
      </span>
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description && <div className="max-w-sm text-sm text-muted-foreground">{description}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  ),
);
EmptyBox.displayName = "EmptyBox";

export { EmptyBox };

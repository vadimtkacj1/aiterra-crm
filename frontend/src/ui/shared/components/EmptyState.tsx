import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    type?: "primary" | "default" | "dashed";
    /** Optional loading state for async actions (e.g. reload). */
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  image?: ReactNode;
  style?: React.CSSProperties;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  image,
  style,
}: EmptyStateProps) {
  const visual = image || icon || (
    <Inbox aria-hidden="true" className="size-16 text-(--ds-text-disabled)" strokeWidth={1.25} />
  );

  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ padding: "40px 20px", ...style }}
    >
      <div className="flex items-center justify-center text-(--ds-text-disabled)">
        {visual}
      </div>

      {(title || description) && (
        <div className="mt-3 flex flex-col gap-1.5">
          {title && <span className="text-base font-semibold text-foreground">{title}</span>}
          {description && (
            <span className="max-w-sm text-sm text-muted-foreground">{description}</span>
          )}
        </div>
      )}

      {(action || secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <Button
              variant={action.type === "default" || action.type === "dashed" ? "outline" : "default"}
              onClick={action.onClick}
              disabled={action.loading}
            >
              {action.loading && <Spinner size="sm" className="text-current" aria-hidden="true" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

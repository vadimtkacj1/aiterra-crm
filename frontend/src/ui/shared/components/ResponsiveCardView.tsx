import { Fragment, isValidElement, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function isTagDescriptor(tag: unknown): tag is { label: string; color?: string } {
  return !!tag && typeof tag === "object" && !isValidElement(tag) && "label" in tag;
}

/** antd Tag color strings → badge variants (violet reserved for brand accents). */
function badgeVariant(color?: string): BadgeProps["variant"] {
  switch (color) {
    case "success":
    case "green":
      return "success";
    case "processing":
    case "blue":
      return "processing";
    case "warning":
    case "orange":
    case "gold":
      return "warning";
    case "error":
    case "red":
      return "error";
    case "purple":
      return "primary";
    default:
      return "default";
  }
}

export interface CardViewItem {
  id: string | number;
  title: string;
  subtitle?: string;
  description?: string;
  tags?: Array<{ label: string; color?: string } | ReactNode>;
  actions?: Array<{
    label: string;
    onClick: () => void;
    type?: "primary" | "default" | "dashed" | "link" | "text";
    danger?: boolean;
    icon?: ReactNode;
  }>;
  extra?: ReactNode;
}

interface ResponsiveCardViewProps {
  items: CardViewItem[];
  loading?: boolean;
  emptyText?: string;
}

const ACTION_VARIANT = {
  primary: "default",
  default: "outline",
  dashed: "outline",
  link: "link",
  text: "ghost",
} as const;

export function ResponsiveCardView({ items, loading, emptyText }: ResponsiveCardViewProps) {
  if (loading) {
    return (
      <div className="flex w-full flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="rounded-xl p-4 shadow-(--ds-shadow-card)">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-3 h-3 w-4/5" />
            <Skeleton className="mt-2 h-3 w-3/5" />
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-6">
        <span className="text-sm text-muted-foreground">{emptyText || "No items"}</span>
      </Card>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {items.map((item) => (
        <Card key={item.id} className="rounded-xl p-4 shadow-(--ds-shadow-card)">
          <div className="flex w-full flex-col gap-2">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <span className="text-[15px] font-semibold text-foreground">{item.title}</span>
                {item.subtitle && (
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">
                    {item.subtitle}
                  </span>
                )}
              </div>
              {item.extra && <div className="ms-3">{item.extra}</div>}
            </div>

            {item.description && (
              <p className="mb-0 line-clamp-2 text-[13px] text-muted-foreground">
                {item.description}
              </p>
            )}

            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {item.tags.map((tag, index) =>
                  isTagDescriptor(tag) ? (
                    <Badge key={index} variant={badgeVariant(tag.color)}>
                      {tag.label}
                    </Badge>
                  ) : (
                    <Fragment key={index}>{tag as ReactNode}</Fragment>
                  ),
                )}
              </div>
            )}

            {item.actions && item.actions.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {item.actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={
                      action.danger && action.type === "primary"
                        ? "destructive"
                        : ACTION_VARIANT[action.type ?? "default"]
                    }
                    size="sm"
                    className={cn(
                      action.danger &&
                        action.type !== "primary" &&
                        "border-destructive/40 text-destructive hover:text-destructive",
                    )}
                    onClick={action.onClick}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// Hook to determine if mobile view should be used (antd `md` breakpoint: 768px)
export function useMobileView() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? !window.matchMedia("(min-width: 768px)").matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(!mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

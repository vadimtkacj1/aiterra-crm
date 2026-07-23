import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type StatAccent = "primary" | "green" | "amber" | "red" | "cyan" | "blue" | "teal" | "violet";

/**
 * Only truly semantic statuses tint the icon (quietly). Everything else stays
 * muted — violet/brand color is reserved for interactive states, not ambient
 * tile decoration.
 */
const SEMANTIC_ICON_CLASS: Partial<Record<StatAccent, string>> = {
  green: "text-(--ds-color-success)",
  amber: "text-(--ds-color-warning)",
  red: "text-(--ds-color-error)",
};

interface StatCardProps {
  /** Small caps label above the value. */
  title: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  accent?: StatAccent;
  /** Supporting line under the value (context, or a delta). */
  hint?: ReactNode;
  loading?: boolean;
  onClick?: () => void;
}

/**
 * KPI tile: caps-XS muted label, large tabular number, optional context line,
 * and a subtle muted icon at the tile's end. White surface, hairline border,
 * card shadow. RTL-safe — uses logical flow only.
 */
export function StatCard({ title, value, icon, accent = "primary", hint, loading, onClick }: StatCardProps) {
  const iconClass = SEMANTIC_ICON_CLASS[accent] ?? "text-(--ds-text-tertiary)";

  return (
    <div
      className={cn(
        "flex h-full min-h-24 items-start justify-between gap-3 rounded-xl border border-(--ds-border-subtle) bg-card px-[18px] py-4 shadow-(--ds-shadow-card)",
        onClick && "ds-card-interactive",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium uppercase leading-[1.3] tracking-[0.06em] text-(--ds-text-secondary)">
          {title}
        </div>

        {loading ? (
          <Skeleton className="mt-2 h-7 w-[72px]" />
        ) : (
          <div className="mt-1.5 truncate text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-(--ds-text-primary) tabular-nums">
            {value}
          </div>
        )}

        {hint && !loading ? (
          <div className="mt-1 text-xs text-(--ds-text-tertiary)">{hint}</div>
        ) : null}
      </div>

      {icon ? (
        <div aria-hidden className={cn("mt-0.5 shrink-0 text-lg leading-none [&_svg]:size-[18px]", iconClass)}>
          {icon}
        </div>
      ) : null}
    </div>
  );
}

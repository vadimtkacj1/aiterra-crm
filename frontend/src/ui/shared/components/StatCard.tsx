import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type StatAccent = "primary" | "green" | "amber" | "red" | "cyan" | "blue" | "teal" | "violet";

/** Only genuine statuses get colour, and only on the delta line. */
const SEMANTIC_HINT_CLASS: Partial<Record<StatAccent, string>> = {
  green: "text-(--ds-color-success)",
  amber: "text-(--ds-color-warning)",
  red: "text-(--ds-color-error)",
};

interface StatCardProps {
  /** Small caps label above the value. */
  title: ReactNode;
  value: ReactNode;
  accent?: StatAccent;
  /** Supporting line under the value — context, or a delta. */
  hint?: ReactNode;
  loading?: boolean;
  onClick?: () => void;
  /** Marks this metric as the one currently driving the view. Draws the rail. */
  active?: boolean;
  /**
   * `card` — standalone, carries its own hairline and radius.
   * `cell` — a cell inside a {@link MetricStrip}; the strip owns the frame,
   *   so the tile draws no border of its own and the 1px grid gaps become
   *   the rules between metrics.
   */
  variant?: "card" | "cell";
}

/**
 * Metric readout — caps label, large tabular number, delta line. Three things,
 * flat, hairline-bounded.
 *
 * Two deliberate subtractions from the old tile:
 *
 * 1. No decorative icon. A wallet glyph next to a currency figure adds no
 *    information and is the clearest tell of a template dashboard; the number
 *    is the content, so nothing may compete with it.
 * 2. The value is weight 500, not 800. Mezmo's rule — "authority through
 *    restraint" — a very large number does not also need to shout. What makes
 *    it read as data is the tabular figures and tight optical tracking.
 *
 * Colour appears only on a semantic delta, and the rail only when this metric
 * is the active one.
 */
export function StatCard({
  title,
  value,
  accent = "primary",
  hint,
  loading,
  onClick,
  active,
  variant = "card",
}: StatCardProps) {
  const hintClass = SEMANTIC_HINT_CLASS[accent] ?? "text-(--ds-text-tertiary)";

  return (
    <div
      className={cn(
        "relative flex h-full min-h-24 flex-col justify-start overflow-hidden bg-card px-4 py-3.5",
        variant === "card" &&
          cn("rounded-card border", active ? "border-(--ds-border-strong)" : "border-(--ds-border-subtle)"),
        onClick && "ds-card-interactive",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? active : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      {active && <span aria-hidden="true" className="ds-rail ds-rail--block-start" />}

      <div className="ds-label-caps truncate">{title}</div>

      {loading ? (
        <Skeleton className="mt-2 h-7 w-18" />
      ) : (
        <div className="mt-1.5 truncate text-[28px] font-medium leading-[1.1] tracking-(--ds-track-display) text-foreground tabular-nums">
          {value}
        </div>
      )}

      {hint && !loading ? (
        <div className={cn("mt-1 text-xs tabular-nums", hintClass)}>{hint}</div>
      ) : null}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricStripProps {
  children: ReactNode;
  /** Columns at the widest breakpoint. Below that it steps down to 2, then 1. */
  columns?: 2 | 3 | 4;
  className?: string;
}

const COLUMNS: Record<NonNullable<MetricStripProps["columns"]>, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * A row of metrics as ONE ruled instrument panel, not four floating boxes.
 *
 * The default dashboard shape — N cards separated by gaps — is the most
 * recognisable template layout there is, and it reads as four unrelated
 * objects when the numbers are in fact one reading of one thing. Bounding them
 * in a single hairline frame and ruling between them says "this is one panel",
 * which is how Attio and Mezmo present metric readouts and how a printed
 * ledger has always worked.
 *
 * The dividers are the 1px grid `gap` showing the border colour through from
 * the container behind the cells. That costs no extra elements and — unlike
 * `divide-x` — is direction-agnostic, so it is correct in Hebrew RTL without a
 * single override. It also re-rules itself automatically wherever the grid
 * wraps at a smaller breakpoint.
 *
 * Pass `<StatCard variant="cell">` children.
 */
export function MetricStrip({ children, columns = 4, className }: MetricStripProps) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-card border border-(--ds-border-subtle) bg-(--ds-border-subtle)",
        COLUMNS[columns],
        className,
      )}
    >
      {children}
    </div>
  );
}

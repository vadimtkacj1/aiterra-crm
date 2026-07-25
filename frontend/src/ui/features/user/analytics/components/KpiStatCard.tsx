import type { ReactNode } from "react";
import { StatCard, type StatAccent } from "@/ui/shared/components/StatCard";

interface KpiStatCardProps {
  title: ReactNode;
  value: string | number;
  suffix?: ReactNode;
  precision?: number;
  /** Semantic accent — colours the delta line only, never the tile. */
  accent?: StatAccent;
  /** @deprecated tiles no longer carry decorative icons; ignored. */
  icon?: ReactNode;
  /** @deprecated retained for call-site compatibility; layout is handled by StatCard. */
  compact?: boolean;
  /** @deprecated retained for call-site compatibility; StatCard keeps numbers neutral. */
  valueStyle?: React.CSSProperties;
  /** `cell` when rendered inside a MetricStrip. */
  variant?: "card" | "cell";
}

/**
 * KPI tile for the analytics screens. Renders the shared design-system StatCard
 * so campaign KPIs match every other metric readout in the app.
 */
export function KpiStatCard({ title, value, suffix, precision, accent, variant }: KpiStatCardProps) {
  const formatted =
    typeof value === "number"
      ? value.toLocaleString(undefined, {
          minimumFractionDigits: precision ?? 0,
          maximumFractionDigits: precision ?? 0,
        })
      : value;

  return (
    <StatCard
      title={title}
      accent={accent}
      variant={variant}
      value={
        <span>
          {formatted}
          {/* Unit rides at body size next to the figure so the number keeps
              the full weight of the tile. */}
          {suffix ? (
            <span className="ms-1 text-sm font-normal text-(--ds-text-tertiary)">{suffix}</span>
          ) : null}
        </span>
      }
    />
  );
}

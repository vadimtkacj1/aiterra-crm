import type { ReactNode } from "react";
import { StatCard, type StatAccent } from "@/ui/shared/components/StatCard";

interface KpiStatCardProps {
  title: ReactNode;
  value: string | number;
  suffix?: ReactNode;
  precision?: number;
  /** Optional accent for the icon tile / emphasis (kept neutral by default). */
  accent?: StatAccent;
  icon?: ReactNode;
  /** @deprecated retained for call-site compatibility; layout is handled by StatCard. */
  compact?: boolean;
  /** @deprecated retained for call-site compatibility; StatCard keeps numbers neutral. */
  valueStyle?: React.CSSProperties;
}

/**
 * KPI tile for the analytics screens. Renders the shared design-system StatCard
 * (white surface, hairline ring, caps label, big tabular number) so campaign KPIs
 * match every other KPI in the app.
 */
export function KpiStatCard({ title, value, suffix, precision, accent, icon }: KpiStatCardProps) {
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
      icon={icon}
      value={
        <span>
          {formatted}
          {suffix ? (
            <span style={{ fontSize: 14, fontWeight: 500, marginInlineStart: 4 }}>{suffix}</span>
          ) : null}
        </span>
      }
    />
  );
}

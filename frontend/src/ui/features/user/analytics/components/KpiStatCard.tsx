import type { ReactNode } from "react";
import { Card, Statistic } from "antd";

interface KpiStatCardProps {
  title: ReactNode;
  value: string | number;
  suffix?: ReactNode;
  precision?: number;
  /** Compact padding for mobile. */
  compact?: boolean;
  /** Optional value style override (kept neutral by default). */
  valueStyle?: React.CSSProperties;
}

export function KpiStatCard({
  title,
  value,
  suffix,
  precision,
  compact,
  valueStyle,
}: KpiStatCardProps) {
  return (
    <Card
      size="small"
      style={{ border: "none", background: "transparent", boxShadow: "none" }}
      styles={{ body: { padding: compact ? 12 : 20 }, header: { display: "none" } }}
    >
      <Statistic
        title={title}
        value={value}
        suffix={suffix}
        precision={precision}
        valueStyle={valueStyle}
      />
    </Card>
  );
}

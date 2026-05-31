import { Card, Statistic, theme } from "antd";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  prefix?: ReactNode;
  suffix?: ReactNode;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  prefix,
  suffix,
  icon,
  trend,
  loading,
  onClick,
}: StatCardProps) {
  const { token } = theme.useToken();

  return (
    <Card
      loading={loading}
      hoverable={!!onClick}
      onClick={onClick}
      style={{
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Statistic
          title={title}
          value={value}
          prefix={prefix}
          suffix={suffix}
          styles={{ content: { fontSize: 28, fontWeight: 600 } }}
        />
        {icon && (
          <div
            style={{
              fontSize: 32,
              color: token.colorPrimary,
              opacity: 0.8,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            color: trend.isPositive ? token.colorSuccess : token.colorError,
          }}
        >
          {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
        </div>
      )}
    </Card>
  );
}

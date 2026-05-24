import { Card } from "antd";
import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  loading?: boolean;
};

export function ListCard({ icon, title, extra, children, loading }: Props) {
  const cardTitle = icon ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {icon}
      {title}
    </span>
  ) : title;

  return (
    <Card title={cardTitle} extra={extra} loading={loading}>
      {children}
    </Card>
  );
}

import { Card } from "antd";
import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  /** Optional — omit for toolbar-style cards where the page header already names the list. */
  title?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  loading?: boolean;
};

export function ListCard({ icon, title, extra, children, loading }: Props) {
  const cardTitle = title != null && icon ? (
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

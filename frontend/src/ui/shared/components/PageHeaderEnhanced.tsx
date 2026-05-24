import { Breadcrumb, theme, Typography, Space } from "antd";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface BreadcrumbItem {
  title: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: BreadcrumbItem[];
  extra?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumb, extra, actions }: PageHeaderProps) {
  const { token } = theme.useToken();

  return (
    <div style={{ width: "100%" }}>
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 12 }}
          items={breadcrumb.map((item) => ({
            title: item.path ? <Link to={item.path}>{item.title}</Link> : item.title,
          }))}
        />
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          width: "100%",
          paddingBottom: 20,
          borderBottom: `1px solid ${token.colorSplit}`,
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
          <Typography.Title level={3} style={{ margin: 0, lineHeight: 1.25, fontWeight: 600 }}>
            {title}
          </Typography.Title>
          {subtitle && (
            <Typography.Paragraph
              type="secondary"
              style={{
                marginBottom: 0,
                marginTop: 8,
                fontSize: 14,
                lineHeight: 1.55,
                maxWidth: 720,
              }}
            >
              {subtitle}
            </Typography.Paragraph>
          )}
        </div>

        {(extra || actions) && (
          <div style={{ flexShrink: 0, paddingTop: 2 }}>
            <Space size="middle">{extra || actions}</Space>
          </div>
        )}
      </div>
    </div>
  );
}

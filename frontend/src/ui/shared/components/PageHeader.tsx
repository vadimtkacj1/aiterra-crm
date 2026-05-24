import { Breadcrumb, Flex, Space, Typography } from "antd";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  breadcrumbs?: Array<{ title: string; href?: string }>;
  extra?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  description,
  breadcrumbs,
  extra,
  actions
}: PageHeaderProps) {
  const desc = description || subtitle;

  return (
    <div style={{ marginBottom: 24 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb
          items={breadcrumbs.map((b) => ({ title: b.title, href: b.href }))}
          style={{ marginBottom: 12 }}
        />
      )}

      <Flex justify="space-between" align="flex-start" gap={16} wrap="wrap">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Title level={2} style={{ margin: 0, marginBottom: desc ? 8 : 0, fontSize: 28, fontWeight: 600 }}>
            {title}
          </Typography.Title>
          {desc && (
            <Typography.Text type="secondary" style={{ fontSize: 14, lineHeight: 1.5 }}>
              {desc}
            </Typography.Text>
          )}
        </div>

        {(actions || extra) && (
          <Space size={8} wrap>
            {actions || extra}
          </Space>
        )}
      </Flex>
    </div>
  );
}


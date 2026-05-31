import { Card, Flex, Space, Typography, Button, Tag, Grid } from "antd";
import type { ReactNode } from "react";

const { useBreakpoint } = Grid;

export interface CardViewItem {
  id: string | number;
  title: string;
  subtitle?: string;
  description?: string;
  tags?: Array<{ label: string; color?: string }>;
  actions?: Array<{
    label: string;
    onClick: () => void;
    type?: "primary" | "default" | "dashed" | "link" | "text";
    danger?: boolean;
    icon?: ReactNode;
  }>;
  extra?: ReactNode;
}

interface ResponsiveCardViewProps {
  items: CardViewItem[];
  loading?: boolean;
  emptyText?: string;
}

export function ResponsiveCardView({ items, loading, emptyText }: ResponsiveCardViewProps) {
  if (loading) {
    return (
      <Flex vertical style={{ width: "100%" }} gap={12}>
        {[1, 2, 3].map((i) => (
          <Card key={i} loading size="small" />
        ))}
      </Flex>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <Typography.Text type="secondary">{emptyText || "No items"}</Typography.Text>
      </Card>
    );
  }

  return (
    <Flex vertical style={{ width: "100%" }} gap={12}>
      {items.map((item) => (
        <Card
          key={item.id}
          size="small"
          style={{
            borderRadius: 8,
            border: "1px solid rgba(15, 23, 42, 0.06)",
          }}
        >
          <Flex vertical style={{ width: "100%" }} gap={8}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong style={{ fontSize: 15 }}>
                  {item.title}
                </Typography.Text>
                {item.subtitle && (
                  <Typography.Text type="secondary" style={{ display: "block", fontSize: 13, marginTop: 2 }}>
                    {item.subtitle}
                  </Typography.Text>
                )}
              </div>
              {item.extra && <div style={{ marginLeft: 12 }}>{item.extra}</div>}
            </div>

            {item.description && (
              <Typography.Paragraph
                type="secondary"
                style={{ marginBottom: 0, fontSize: 13 }}
                ellipsis={{ rows: 2 }}
              >
                {item.description}
              </Typography.Paragraph>
            )}

            {item.tags && item.tags.length > 0 && (
              <Space wrap size={[4, 4]}>
                {item.tags.map((tag, index) => (
                  <Tag key={index} color={tag.color} style={{ margin: 0 }}>
                    {tag.label}
                  </Tag>
                ))}
              </Space>
            )}

            {item.actions && item.actions.length > 0 && (
              <Space wrap size={[8, 8]} style={{ marginTop: 4 }}>
                {item.actions.map((action, index) => (
                  <Button
                    key={index}
                    type={action.type || "default"}
                    size="small"
                    danger={action.danger}
                    icon={action.icon}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ))}
              </Space>
            )}
          </Flex>
        </Card>
      ))}
    </Flex>
  );
}

// Hook to determine if mobile view should be used
export function useMobileView() {
  const screens = useBreakpoint();
  return !screens.md;
}

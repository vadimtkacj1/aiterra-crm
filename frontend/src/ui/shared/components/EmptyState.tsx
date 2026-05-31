import { Empty, Button, Flex, Space, Typography } from "antd";
import type { ReactNode } from "react";
import { InboxOutlined } from "@ant-design/icons";

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    type?: "primary" | "default" | "dashed";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  image?: ReactNode;
  style?: React.CSSProperties;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  image,
  style,
}: EmptyStateProps) {
  const defaultIcon = <InboxOutlined style={{ fontSize: 64, color: "rgba(0, 0, 0, 0.25)" }} />;

  return (
    <Empty
      image={image || icon || defaultIcon}
      description={
        title || description ? (
          <Flex vertical gap="small" style={{ marginTop: 8 }}>
            {title && (
              <Typography.Text strong style={{ fontSize: 16 }}>
                {title}
              </Typography.Text>
            )}
            {description && (
              <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                {description}
              </Typography.Text>
            )}
          </Flex>
        ) : undefined
      }
      style={{ padding: "40px 20px", ...style }}
    >
      {(action || secondaryAction) && (
        <Space>
          {action && (
            <Button type={action.type || "primary"} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button type="default" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </Space>
      )}
    </Empty>
  );
}

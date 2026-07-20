import { FacebookOutlined, WalletOutlined } from "@ant-design/icons";
import { Avatar, Button, Flex, Space, Tag, Typography, theme } from "antd";
import { useTranslation } from "react-i18next";
import type { Account } from "@/services/accounts/IAccountService";
import { tokens } from "@/styles/designSystem";

function accountInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface Props {
  account: Account;
  isFirst: boolean;
  isHovered: boolean;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onOpen: () => void;
}

export function AccountListItem({ account, isFirst, isHovered, onHoverEnter, onHoverLeave, onOpen }: Props) {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  return (
    <Flex
      justify="space-between"
      align="center"
      gap={12}
      wrap="wrap"
      style={{
        padding: "12px 10px",
        marginInline: -10,
        borderRadius: token.borderRadius,
        borderTop: !isFirst ? `1px solid ${token.colorSplit}` : undefined,
        transition: "background-color 0.15s ease",
        backgroundColor: isHovered ? token.colorFillAlter : undefined,
      }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      <Flex align="center" gap={12} style={{ minWidth: 0, flex: 1 }}>
        <Avatar
          shape="square"
          size={40}
          style={{
            flexShrink: 0,
            background: tokens.colors.surface2,
            color: tokens.colors.textSecondary,
            fontWeight: 600,
            fontSize: 15,
            borderRadius: tokens.radius.lg,
          }}
        >
          {accountInitials(account.name)}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <Space size={8} wrap>
            <Typography.Text strong>{account.name}</Typography.Text>
            {account.hasMeta ? (
              <Tag icon={<FacebookOutlined />} color="blue">
                {t("accounts.badgeMeta")}
              </Tag>
            ) : (
              <Tag icon={<WalletOutlined />}>{t("accounts.badgeNoMeta")}</Tag>
            )}
          </Space>
        </div>
      </Flex>
      <Button type="primary" size="large" style={{ minHeight: 44 }} onClick={onOpen}>
        {t("accounts.open")}
      </Button>
    </Flex>
  );
}

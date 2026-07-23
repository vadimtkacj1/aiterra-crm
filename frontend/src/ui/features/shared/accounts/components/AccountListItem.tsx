import { FacebookOutlined, WalletOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Flex, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { Account } from "@/services/accounts/IAccountService";

function accountInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface Props {
  account: Account;
  onOpen: () => void;
}

export function AccountListItem({ account, onOpen }: Props) {
  const { t } = useTranslation();

  return (
    <Card
      className="ds-card-interactive"
      onClick={onOpen}
      style={{ width: "100%" }}
      styles={{ body: { padding: "16px 20px" } }}
    >
      <Flex justify="space-between" align="center" gap={12} wrap="wrap">
        <Flex align="center" gap={12} style={{ minWidth: 0, flex: 1 }}>
          <Avatar
            shape="square"
            size={40}
            style={{
              flexShrink: 0,
              background: "var(--ds-surface-2)",
              color: "var(--ds-text-secondary)",
              fontWeight: 600,
              fontSize: 15,
              borderRadius: 10,
            }}
          >
            {accountInitials(account.name)}
          </Avatar>
          <Flex vertical gap={2} style={{ minWidth: 0 }}>
            <Typography.Text strong style={{ fontSize: 15 }}>
              {account.name}
            </Typography.Text>
            <div>
              {account.hasMeta ? (
                <Tag icon={<FacebookOutlined />} color="blue" style={{ marginInlineEnd: 0 }}>
                  {t("accounts.badgeMeta")}
                </Tag>
              ) : (
                <Tag icon={<WalletOutlined />} style={{ marginInlineEnd: 0 }}>
                  {t("accounts.badgeNoMeta")}
                </Tag>
              )}
            </div>
          </Flex>
        </Flex>
        <Button
          type="primary"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          {t("accounts.open")}
        </Button>
      </Flex>
    </Card>
  );
}

import { FacebookOutlined, WalletOutlined } from "@ant-design/icons";
import { Button, Flex, Space, Tag, Typography, theme } from "antd";
import { useTranslation } from "react-i18next";
import type { Account } from "../../../../services/interfaces/IAccountService";

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
      <div style={{ minWidth: 0, flex: 1 }}>
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
      <Button type="primary" size="large" style={{ minHeight: 44 }} onClick={onOpen}>
        {t("accounts.open")}
      </Button>
    </Flex>
  );
}

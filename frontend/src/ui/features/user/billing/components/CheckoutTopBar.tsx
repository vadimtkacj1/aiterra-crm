import { ArrowLeftOutlined, LockOutlined } from "@ant-design/icons";
import { Button, Flex, theme } from "antd";
import { useTranslation } from "react-i18next";

interface Props {
  onBack?: () => void;
}

export function CheckoutTopBar({ onBack }: Props) {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  return (
    <div
      style={{
        padding: "16px 24px",
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      {onBack && (
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          style={{ color: token.colorTextSecondary, fontWeight: 500 }}
        >
          {t("common.back")}
        </Button>
      )}
      <Flex align="center" gap={6} style={{ marginLeft: "auto", color: token.colorTextSecondary, fontSize: 13 }}>
        <LockOutlined style={{ fontSize: 13 }} />
        {t("billing.secureCheckout")}
      </Flex>
    </div>
  );
}

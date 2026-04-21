import { ArrowLeftOutlined, LockOutlined } from "@ant-design/icons";
import { Button, Flex } from "antd";
import { useTranslation } from "react-i18next";

interface Props {
  onBack: () => void;
}

export function CheckoutTopBar({ onBack }: Props) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        padding: "16px 24px",
        borderBottom: "1px solid rgba(15,23,42,.07)",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={onBack}
        style={{ color: "#64748b", fontWeight: 500 }}
      >
        {t("common.back")}
      </Button>
      <Flex align="center" gap={6} style={{ marginLeft: "auto", color: "#64748b", fontSize: 13 }}>
        <LockOutlined style={{ fontSize: 13 }} />
        {t("billing.secureCheckout")}
      </Flex>
    </div>
  );
}

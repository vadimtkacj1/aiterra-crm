import { Button, theme } from "antd";
import type { TFunction } from "i18next";
import { CheckoutTopBar } from "../components/CheckoutTopBar";
import { tokens } from "@/styles/designSystem";

type Props = {
  t: TFunction;
  onBack: () => void;
};

export function CheckoutSuccessScreen({ t, onBack }: Props) {
  const { token } = theme.useToken();

  return (
    <div style={{ minHeight: "100vh", background: token.colorBgLayout, display: "flex", flexDirection: "column" }}>
      <CheckoutTopBar onBack={onBack} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
        <div
          style={{
            background: token.colorBgContainer,
            borderRadius: tokens.radius.lg,
            border: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: tokens.shadow.md,
            padding: "48px 40px",
            maxWidth: 440,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16, color: token.colorSuccess }}>✓</div>
          <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: token.colorText }}>
            {t("billing.paymentSuccessTitle")}
          </p>
          <p style={{ fontSize: 14, color: token.colorTextSecondary, margin: "0 0 28px" }}>{t("billing.paymentSuccessDesc")}</p>
          <Button type="primary" size="large" onClick={onBack} style={{ width: "100%", fontWeight: 600, fontSize: 15 }}>
            {t("billing.paymentSuccessBack")}
          </Button>
        </div>
      </div>
    </div>
  );
}

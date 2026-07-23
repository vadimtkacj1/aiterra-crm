import { useTranslation } from "react-i18next";
import { CheckoutTopBar } from "../components/CheckoutTopBar";
import { tokens } from "@/styles/designSystem";

export function PaymentFailedPage() {
  const { t } = useTranslation();

  return (
    <div style={{ minHeight: "100vh", background: "var(--ds-surface-1)", display: "flex", flexDirection: "column" }}>
      <CheckoutTopBar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
        <div
          style={{
            background: "var(--ds-surface-0)",
            borderRadius: tokens.radius.lg,
            border: "1px solid var(--ds-border-subtle)",
            boxShadow: tokens.shadow.md,
            padding: "48px 40px",
            maxWidth: 440,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16, color: "var(--ds-color-error)" }}>✗</div>
          <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "var(--ds-text-primary)" }}>
            {t("billing.paymentFailedTitle")}
          </p>
          <p style={{ fontSize: 14, color: "var(--ds-text-secondary)", margin: 0 }}>{t("billing.paymentFailedDesc")}</p>
        </div>
      </div>
    </div>
  );
}

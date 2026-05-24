import { useTranslation } from "react-i18next";
import { CheckoutTopBar } from "../components/CheckoutTopBar";

export function PaymentFailedPage() {
  const { t } = useTranslation();

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", flexDirection: "column" }}>
      <CheckoutTopBar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid rgba(15,23,42,.09)",
            boxShadow: "0 2px 12px rgba(15,23,42,.06)",
            padding: "48px 40px",
            maxWidth: 440,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16, color: "#ff4d4f" }}>✗</div>
          <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "#0f172a" }}>
            {t("billing.paymentFailedTitle")}
          </p>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>{t("billing.paymentFailedDesc")}</p>
        </div>
      </div>
    </div>
  );
}

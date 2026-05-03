import type { TFunction } from "i18next";
import { CheckoutTopBar } from "../components/CheckoutTopBar";

type Props = {
  t: TFunction;
  onBack: () => void;
};

export function CheckoutSuccessScreen({ t, onBack }: Props) {
  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", flexDirection: "column" }}>
      <CheckoutTopBar onBack={onBack} />
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
          <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
          <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "#0f172a" }}>
            {t("billing.paymentSuccessTitle")}
          </p>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 28px" }}>{t("billing.paymentSuccessDesc")}</p>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: "#1677ff",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 28px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
            }}
          >
            {t("billing.paymentSuccessBack")}
          </button>
        </div>
      </div>
    </div>
  );
}

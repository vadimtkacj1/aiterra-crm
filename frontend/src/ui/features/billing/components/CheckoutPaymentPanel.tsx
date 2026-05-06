import { CheckCircleFilled, CreditCardOutlined, WalletOutlined } from "@ant-design/icons";
import { Button, Checkbox, Divider, Flex, Typography } from "antd";
import { useTranslation } from "react-i18next";

interface Props {
  total: string;
  intent: "savedCard" | "hosted";
  loading: boolean;
  consentChecked: boolean;
  onConsentChange: (checked: boolean) => void;
  termsUrl: string;
  privacyUrl: string;
  cancelUrl: string;
  onPay: () => void;
}

export function CheckoutPaymentPanel({
  total,
  intent,
  loading,
  consentChecked,
  onConsentChange,
  termsUrl,
  privacyUrl,
  cancelUrl,
  onPay,
}: Props) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        flex: "0 0 340px",
        minWidth: 300,
        background: "#fff",
        borderRadius: 14,
        border: "1px solid rgba(15,23,42,.09)",
        boxShadow: "0 2px 12px rgba(15,23,42,.06)",
        padding: "28px 28px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          {t("billing.invoiceTotal")}
        </Typography.Text>
        <Typography.Title
          level={2}
          style={{ margin: 0, fontWeight: 700, letterSpacing: "-0.03em", fontSize: 32 }}
        >
          {total}
        </Typography.Title>
      </div>

      <Divider style={{ margin: 0 }} />

      <Flex
        align="center"
        gap={10}
        style={{
          padding: "12px 14px",
          borderRadius: 8,
          background: "#f8fafc",
          border: "1px solid rgba(15,23,42,.07)",
        }}
      >
        {intent === "savedCard" ? (
          <CreditCardOutlined style={{ fontSize: 18, color: "#64748b" }} />
        ) : (
          <WalletOutlined style={{ fontSize: 18, color: "#64748b" }} />
        )}
        <div>
          <Typography.Text strong style={{ fontSize: 13, display: "block" }}>
            {intent === "savedCard" ? t("billing.payWithSavedCard") : t("billing.payNow")}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {intent === "savedCard" ? t("billing.checkoutSavedCardNote") : t("billing.checkoutHostedNote")}
          </Typography.Text>
        </div>
      </Flex>

      <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: 12, lineHeight: 1.55 }}>
        {t("billing.checkoutPayNote")}
      </Typography.Paragraph>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Checkbox checked={consentChecked} onChange={(e) => onConsentChange(e.target.checked)}>
          <Typography.Text style={{ fontSize: 13 }}>
            {intent === "savedCard" ? t("billing.checkoutConsentSaved") : t("billing.checkoutConsentHosted")}
          </Typography.Text>
        </Checkbox>
        <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.5 }}>
          {t("billing.checkoutLegal")}{" "}
          <a href={termsUrl} target="_blank" rel="noreferrer">
            {t("billing.checkoutTermsLink")}
          </a>{" "}
          {t("billing.checkoutAnd")}{" "}
          <a href={privacyUrl} target="_blank" rel="noreferrer">
            {t("billing.checkoutPrivacyPolicyLink")}
          </a>{" "}
          {t("billing.checkoutAnd")}{" "}
          <a href={cancelUrl} target="_blank" rel="noreferrer">
            {t("billing.checkoutCancelPolicyLink")}
          </a>
          .
        </Typography.Text>
      </div>

      <Button
        type="primary"
        size="large"
        icon={intent === "savedCard" ? <CreditCardOutlined /> : <WalletOutlined />}
        loading={loading}
        disabled={!consentChecked}
        onClick={onPay}
        style={{ height: 48, borderRadius: 10, fontWeight: 600, fontSize: 15, boxShadow: "none" }}
      >
        {intent === "savedCard" ? t("billing.payWithSavedCard") : t("billing.payNow")}
      </Button>

      <Flex align="center" justify="center" gap={6}>
        <CheckCircleFilled style={{ fontSize: 13, color: "#22c55e" }} />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t("billing.invoiceSecureNote")}
        </Typography.Text>
      </Flex>
    </div>
  );
}

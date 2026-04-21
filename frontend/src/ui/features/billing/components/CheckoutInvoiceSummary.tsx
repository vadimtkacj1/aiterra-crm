import { Divider, Flex, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { PendingPaymentAction } from "../../../../services/interfaces/IBillingService";

function formatMoney(amount: number, currency: string): string {
  const cur = (currency || "ILS").length === 3 ? currency.toUpperCase() : "ILS";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

interface Props {
  payment: PendingPaymentAction;
}

export function CheckoutInvoiceSummary({ payment }: Props) {
  const { t } = useTranslation();
  const total = formatMoney(payment.amount, payment.currency);

  return (
    <div style={{ flex: "1 1 320px", minWidth: 0 }}>
      <Typography.Text
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#94a3b8",
          display: "block",
          marginBottom: 16,
        }}
      >
        {t("billing.invoiceHeading")}
      </Typography.Text>

      <Typography.Title level={3} style={{ margin: "0 0 6px", fontWeight: 700, letterSpacing: "-0.02em" }}>
        {payment.summary}
      </Typography.Title>
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        {payment.flow === "monthly" ? t("billing.flowMonthly") : t("billing.flowOneTime")}
      </Typography.Text>

      {payment.lineItems && payment.lineItems.length > 0 && (
        <div
          style={{
            marginTop: 28,
            borderRadius: 10,
            border: "1px solid rgba(15,23,42,.08)",
            background: "#fff",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 16px 8px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "#94a3b8",
              borderBottom: "1px solid rgba(15,23,42,.06)",
            }}
          >
            {t("billing.invoiceLinesHeading")}
          </div>
          {payment.lineItems.map((li, i) => (
            <Flex
              key={i}
              justify="space-between"
              align="center"
              style={{
                padding: "12px 16px",
                borderTop: i > 0 ? "1px solid rgba(15,23,42,.05)" : undefined,
              }}
            >
              <Typography.Text style={{ fontSize: 14, color: "#0f172a" }}>
                {li.label}
                {li.code ? (
                  <Typography.Text type="secondary" style={{ marginInlineStart: 6, fontSize: 12 }}>
                    ({li.code})
                  </Typography.Text>
                ) : null}
              </Typography.Text>
              <Typography.Text style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                {formatMoney(li.amount, payment.currency)}
              </Typography.Text>
            </Flex>
          ))}
          <Divider style={{ margin: 0 }} />
          <Flex justify="space-between" align="center" style={{ padding: "14px 16px" }}>
            <Typography.Text strong style={{ fontSize: 14 }}>
              {t("billing.invoiceTotal")}
            </Typography.Text>
            <Typography.Text strong style={{ fontSize: 18, letterSpacing: "-0.01em" }}>
              {total}
            </Typography.Text>
          </Flex>
        </div>
      )}
    </div>
  );
}

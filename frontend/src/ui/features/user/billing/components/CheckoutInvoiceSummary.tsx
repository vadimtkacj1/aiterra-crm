import { useTranslation } from "react-i18next";
import type { PendingPaymentAction } from "@/services/billing/IBillingService";
import { Separator } from "@/components/ui/separator";

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
      <span
        className="block text-[11px] font-semibold uppercase text-(--ds-text-tertiary)"
        style={{ letterSpacing: "0.08em", marginBottom: 16 }}
      >
        {t("billing.invoiceHeading")}
      </span>

      <h3 className="m-0 mb-1.5 text-xl font-bold tracking-[-0.02em]">{payment.summary}</h3>
      <span className="text-[13px] text-muted-foreground">
        {payment.flow === "monthly" ? t("billing.flowMonthly") : t("billing.flowOneTime")}
      </span>

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
            className="text-[11px] font-semibold uppercase text-(--ds-text-tertiary)"
            style={{
              padding: "10px 16px 8px",
              letterSpacing: "0.07em",
              borderBottom: "1px solid rgba(15,23,42,.06)",
            }}
          >
            {t("billing.invoiceLinesHeading")}
          </div>
          {payment.lineItems.map((li, i) => (
            <div
              key={i}
              className="flex items-center justify-between"
              style={{
                padding: "12px 16px",
                borderTop: i > 0 ? "1px solid rgba(15,23,42,.05)" : undefined,
              }}
            >
              <span className="text-sm text-(--ds-text-primary)">
                {li.label}
                {li.code ? (
                  <span className="ms-1.5 text-xs text-muted-foreground">({li.code})</span>
                ) : null}
              </span>
              <span className="text-sm font-medium tabular-nums">
                {formatMoney(li.amount, payment.currency)}
              </span>
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between" style={{ padding: "14px 16px" }}>
            <span className="text-sm font-semibold">{t("billing.invoiceTotal")}</span>
            <span className="text-lg font-semibold tracking-[-0.01em] tabular-nums">{total}</span>
          </div>
        </div>
      )}
    </div>
  );
}

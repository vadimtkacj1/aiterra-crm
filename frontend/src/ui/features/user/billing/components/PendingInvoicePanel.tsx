import { FileText, RefreshCw, RotateCw, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PendingPaymentAction } from "@/services/billing/IBillingService";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { appLocaleFromLanguage, billingShell, formatInvoiceMoney } from "./billingUtils";

interface Props {
  payment: PendingPaymentAction;
  onRefresh?: () => void;
  onCheckout: (intent: "savedCard" | "hosted") => void;
}

export function PendingInvoicePanel({ payment, onRefresh, onCheckout }: Props) {
  const { t, i18n } = useTranslation();
  const locale = appLocaleFromLanguage(i18n.language ?? "en");
  const isMonthly = payment.flow === "monthly";
  const lines = payment.lineItems ?? [];
  const hasLines = lines.length > 0;

  const shell = isMonthly
    ? {
        background: "var(--ds-color-primary-surface)",
        border: "1px solid var(--ds-color-primary-surface-muted)",
        iconBg: "var(--ds-color-primary-surface)",
        iconBorder: "1px solid var(--ds-color-primary-surface-muted)",
        iconColor: "var(--ds-color-primary)",
        FlowIcon: RotateCw,
      }
    : {
        background: "var(--ds-surface-1)",
        border: "1px solid var(--ds-border-subtle)",
        iconBg: "var(--ds-surface-2)",
        iconBorder: "1px solid var(--ds-border-subtle)",
        iconColor: "var(--ds-color-info)",
        FlowIcon: FileText,
      };

  const lineItemsPopover = hasLines ? (
    <div style={{ minWidth: 260, maxWidth: 340 }}>
      <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-(--ds-letter-spacing-caps) text-(--ds-text-tertiary)">
        {t("billing.invoiceLinesHeading")}
      </span>
      {lines.map((li, idx) => (
        <div
          key={`${payment.id}-li-${idx}`}
          className="flex items-center justify-between gap-4"
          style={{
            padding: "7px 0",
            borderTop: idx > 0 ? "1px solid var(--ds-border-subtle)" : undefined,
          }}
        >
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[13px]">{li.label}</span>
            {li.code ? (
              <span
                className="mt-px block text-[11px] text-muted-foreground"
                style={{ fontFamily: billingShell.mono }}
              >
                {li.code}
              </span>
            ) : null}
          </div>
          <span
            className="whitespace-nowrap text-[13px] font-semibold tabular-nums"
            style={{ fontFamily: billingShell.mono }}
          >
            {formatInvoiceMoney(li.amount, payment.currency, locale)}
          </span>
        </div>
      ))}
      <div
        className="flex items-center justify-between"
        style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--ds-border-subtle)" }}
      >
        <span className="text-xs text-muted-foreground">{t("billing.invoiceTotal")}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: billingShell.mono }}>
          {formatInvoiceMoney(payment.amount, payment.currency, locale)}
        </span>
      </div>
    </div>
  ) : null;

  const FlowIcon = shell.FlowIcon;

  return (
    <div
      style={{
        borderRadius: billingShell.radiusMd,
        border: shell.border,
        background: shell.background,
        overflow: "hidden",
        boxShadow: billingShell.shadow,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4" style={{ padding: "14px 16px" }}>
        {/* Left: icon + info */}
        <div className="flex min-w-0 flex-[1_1_200px] items-center gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center"
            style={{
              borderRadius: billingShell.radiusMd,
              background: shell.iconBg,
              border: shell.iconBorder,
              color: shell.iconColor,
            }}
          >
            <FlowIcon aria-hidden="true" className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="mb-0.5 flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold">{payment.summary}</span>
              <span
                className="shrink-0 uppercase"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  padding: "3px 10px",
                  borderRadius: 6,
                  background: isMonthly ? "var(--ds-color-primary)" : "var(--ds-surface-2)",
                  border: isMonthly
                    ? "1px solid var(--ds-color-primary)"
                    : "1px solid var(--ds-border-subtle)",
                  color: isMonthly ? "var(--ds-text-inverse)" : "var(--ds-text-secondary)",
                }}
              >
                {isMonthly ? t("billing.flowMonthlyShort") : t("billing.flowOneTimeShort")}
              </span>
            </div>
            {hasLines ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="cursor-pointer border-0 bg-transparent p-0 text-xs text-(--ds-text-link) hover:text-(--ds-text-link-hover) hover:underline"
                  >
                    {t("billing.pendingLineItemsTrigger", { count: lines.length })}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto" style={{ padding: "14px 16px" }}>
                  {lineItemsPopover}
                </PopoverContent>
              </Popover>
            ) : payment.installmentMonths != null &&
              payment.installmentMonths >= 2 &&
              payment.installmentTotalAmount != null ? (
              <span className="text-xs text-muted-foreground">
                {t("billing.installmentPlanSubtitle", {
                  perMonth: formatInvoiceMoney(payment.amount, payment.currency, locale),
                  total: formatInvoiceMoney(payment.installmentTotalAmount, payment.currency, locale),
                  months: payment.installmentMonths,
                })}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">{t("billing.invoiceSubtitle")}</span>
            )}
          </div>
        </div>

        {/* Right: amount + action */}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          <span
            className="whitespace-nowrap text-lg font-semibold tabular-nums tracking-[-0.01em]"
            style={{ fontFamily: billingShell.mono }}
          >
            {formatInvoiceMoney(payment.amount, payment.currency, locale)}
          </span>

          {payment.payUrl ? (
            <Button
              onClick={() => onCheckout("hosted")}
              className="h-9.5 rounded-xl px-4.5 font-semibold shadow-none"
            >
              <Wallet aria-hidden="true" />
              {t("billing.payNow")}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Spinner size="sm" className="text-(--ds-text-secondary)" />
              {onRefresh ? (
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => onRefresh()}>
                  <RefreshCw aria-hidden="true" />
                  {t("billing.refreshPaymentStatus")}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

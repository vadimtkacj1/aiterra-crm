import type { ReactNode } from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { i18n } from "@/i18n";

/** App locale for dates/money — follows the UI language, not the browser locale. */
function appLocale(): string {
  return (i18n.language ?? "en").startsWith("he") ? "he-IL" : "en-US";
}

const PAYMENT_STATUS_MAP: Record<string, { color: string; labelKey: string }> = {
  paid: { color: "success", labelKey: "admin.payments.payStatePaid" },
  pending: { color: "warning", labelKey: "admin.payments.payStatePending" },
  unpaid: { color: "warning", labelKey: "admin.payments.payStateUnpaid" },
  voided: { color: "default", labelKey: "admin.payments.payStateVoided" },
  cancelled: { color: "error", labelKey: "admin.payments.payStateCancelled" },
  superseded: { color: "default", labelKey: "admin.payments.payStateSuperseded" },
  ongoing: { color: "processing", labelKey: "admin.payments.payStateOngoing" },
  unknown: { color: "default", labelKey: "admin.payments.payStateUnknown" },
};

/** shadcn Badge payment-status chip — antd color names map 1:1 to Badge variants. */
export function paymentStatusBadge(t: (key: string) => string, status: string): ReactNode {
  const m = PAYMENT_STATUS_MAP[status] ?? PAYMENT_STATUS_MAP.unknown;
  return <Badge variant={m.color as BadgeProps["variant"]}>{t(m.labelKey)}</Badge>;
}

export function formatHistoryDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(appLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatHistoryDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(appLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatMoney(amount: number, currency: string): string {
  const cur = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(appLocale(), {
      style: "currency",
      currency: cur.length === 3 ? cur : "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}

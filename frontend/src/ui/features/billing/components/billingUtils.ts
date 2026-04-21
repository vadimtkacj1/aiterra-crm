export const billingShell = {
  radius: 8,
  radiusMd: 10,
  radiusLg: 12,
  border: "rgba(15, 23, 42, 0.09)",
  borderInner: "rgba(15, 23, 42, 0.06)",
  shadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  fillMuted: "rgba(15, 23, 42, 0.028)",
  fillWell: "rgba(15, 23, 42, 0.04)",
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
} as const;

export function fmtDateTime(ts: string, locale = "en-US"): string {
  try {
    return new Date(ts).toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export function statusColor(s: string): string {
  const m: Record<string, string> = {
    SETTLED: "green",
    REFUND: "blue",
    FAILED: "red",
    PENDING: "gold",
    succeeded: "green",
    pending: "gold",
    failed: "red",
  };
  return m[s] ?? "default";
}

export function appLocaleFromLanguage(lng: string): string {
  return lng.startsWith("he") ? "he-IL" : "en-US";
}

export function formatInvoiceMoney(amount: number, currency: string, locale = "en-US"): string {
  const cur = (currency || "ILS").length === 3 ? currency.toUpperCase() : "ILS";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

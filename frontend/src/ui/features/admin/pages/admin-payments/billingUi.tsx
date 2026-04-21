import { Tag, Typography } from "antd";
import type { ReactNode } from "react";

export function paymentStatusTag(t: (key: string) => string, status: string): ReactNode {
  const map: Record<string, { color: string; labelKey: string }> = {
    paid: { color: "success", labelKey: "admin.payments.payStatePaid" },
    unpaid: { color: "warning", labelKey: "admin.payments.payStateUnpaid" },
    voided: { color: "default", labelKey: "admin.payments.payStateVoided" },
    cancelled: { color: "error", labelKey: "admin.payments.payStateCancelled" },
    superseded: { color: "default", labelKey: "admin.payments.payStateSuperseded" },
    ongoing: { color: "processing", labelKey: "admin.payments.payStateOngoing" },
    unknown: { color: "default", labelKey: "admin.payments.payStateUnknown" },
  };
  const m = map[status] ?? map.unknown;
  return <Tag color={m.color}>{t(m.labelKey)}</Tag>;
}

export function formatMoney(amount: number, currency: string): string {
  const cur = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur.length === 3 ? cur : "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}

export function SectionStep({ step, title, hint }: { step: string; title: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Typography.Text
        type="secondary"
        style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", display: "block" }}
      >
        {step}
      </Typography.Text>
      <Typography.Title level={5} style={{ margin: "6px 0 0", fontWeight: 700 }}>
        {title}
      </Typography.Title>
      {hint ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: 6, marginBottom: 0, fontSize: 12, lineHeight: 1.5 }}>
          {hint}
        </Typography.Paragraph>
      ) : null}
    </div>
  );
}

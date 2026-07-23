import { format, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import type {
  AdminPaymentCurrencySummary,
  AdminPaymentStats,
  AdminPaymentStatsBucket,
} from "@/services/admin/AdminService";

export type AdminStatsPeriod = "week" | "month" | "year";

/** Mirrors Statistics page period toggle → API query for `/admin/stats/payments`. */
export function getAdminStatsPeriodRange(
  period: AdminStatsPeriod,
  /** Inject fixed clock in tests; default `new Date()` in UI. */
  now: Date = new Date(),
): { startDate: string; endDate: string; groupBy: "day" | "month" } {
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  if (period === "week") {
    return {
      startDate: fmt(startOfWeek(now)),
      endDate: fmt(now),
      groupBy: "day",
    };
  }
  if (period === "month") {
    return {
      startDate: fmt(startOfMonth(now)),
      endDate: fmt(now),
      groupBy: "day",
    };
  }
  return {
    startDate: fmt(startOfYear(now)),
    endDate: fmt(now),
    groupBy: "month",
  };
}

/** KPI card “Revenue” text from payment stats currencies. */
export function formatRevenueSummary(currencies: AdminPaymentCurrencySummary[] | undefined | null): string {
  if (!currencies?.length) return "0.00";
  const parts = currencies
    .filter((x) => x.paidAmount > 0)
    .slice(0, 3)
    .map((x) => `${x.paidAmount.toFixed(2)} ${x.currency}`);
  return parts.length ? parts.join(" + ") : "0.00";
}

/** Ant Design Plots Line series rows (paid vs unpaid counts per bucket). */
export function buildRevenueLineChartData(
  paymentStats: AdminPaymentStats | null | undefined,
  paidLabel: string,
  unpaidLabel: string,
): { label: string; series: string; value: number }[] {
  if (!paymentStats?.buckets?.length) return [];
  return paymentStats.buckets.slice(0, 24).flatMap((b: AdminPaymentStatsBucket) => [
    { label: b.label, series: paidLabel, value: b.paidCount },
    { label: b.label, series: unpaidLabel, value: b.unpaidCount },
  ]);
}

/** Pie chart: paid amount per currency (only currencies with paidAmount > 0). */
export function buildCurrencyPieData(
  paymentStats: AdminPaymentStats | null | undefined,
): { type: string; value: number }[] {
  if (!paymentStats?.currencies?.length) return [];
  return paymentStats.currencies
    .filter((c) => c.paidAmount > 0)
    .map((c) => ({ type: c.currency, value: parseFloat(c.paidAmount.toFixed(2)) }));
}

export type LineFormRow = { code?: string; label?: string; amount?: number | null };

export const BILLING_CURRENCIES = ["USD", "ILS", "EUR", "GBP"] as const;

export type BillingSchedule = "monthly" | "weekly" | "minutely";

export type AdminPaymentsFormValues = {
  userId: string;
  chargeType: "none" | "one_time" | "monthly";
  amount?: number | null;
  currency: string;
  description?: string;
  useBreakdown: boolean;
  lineItems?: LineFormRow[];
  /** Monthly only: split contract total into N equal recurring charges (2–60). */
  splitAcrossMonths?: number | null;
  /** Monthly only: which schedule type is selected. */
  billingSchedule?: BillingSchedule | null;
  /** Monthly + billingSchedule=monthly: day of month (1–28). */
  billingDay?: number | null;
  /** Monthly + billingSchedule=weekly: day of week (0=Mon … 6=Sun). */
  billingWeekDay?: number | null;
  /** Monthly + billingSchedule=minutely: interval in minutes. */
  testIntervalMinutes?: number | null;
};

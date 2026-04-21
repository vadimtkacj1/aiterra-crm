export type LineFormRow = { code?: string; label?: string; amount?: number | null };

export const BILLING_CURRENCIES = ["USD", "ILS", "EUR", "GBP"] as const;

export type AdminPaymentsFormValues = {
  userId: string;
  chargeType: "none" | "one_time" | "monthly";
  amount?: number | null;
  currency: string;
  description?: string;
  useBreakdown: boolean;
  lineItems?: LineFormRow[];
};

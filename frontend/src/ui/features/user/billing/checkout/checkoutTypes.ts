import type { PendingPaymentAction } from "@/services/billing/IBillingService";

export interface CheckoutLocationState {
  payment: PendingPaymentAction;
  intent: "savedCard" | "hosted";
}

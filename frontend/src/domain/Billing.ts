export type PaymentId = string;
export type SubscriptionId = string;
export type OfferId = string;

export interface PaymentRecord {
  id: PaymentId;
  date: string;
  amount: number;
  currency: string;
  description: string;
  status: "succeeded" | "pending" | "failed";
}

export interface SubscriptionRecord {
  id: SubscriptionId;
  planName: string;
  status: "active" | "canceled" | "past_due";
  renewsAt: string;
  amount: number;
  currency: string;
}

export interface OfferRecord {
  id: OfferId;
  title: string;
  description: string;
  validUntil: string;
  discountPercent?: number;
}

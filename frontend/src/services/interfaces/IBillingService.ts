import type {
  OfferRecord,
  PaymentRecord,
  SubscriptionRecord,
} from "../../domain/Billing";

export type PendingPaymentFlow = "one_time" | "monthly";

export interface PendingPaymentLineItem {
  code?: string;
  label: string;
  amount: number;
}

export interface PendingPaymentAction {
  id: string;
  flow: PendingPaymentFlow;
  amount: number;
  currency: string;
  /** Short line e.g. "Platform fee — January" */
  summary: string;
  /** Z-Credit hosted payment page URL — open in a new tab. */
  payUrl: string | null;
  /** Optional breakdown (server, domain, tokens, …) from admin. */
  lineItems?: PendingPaymentLineItem[] | null;
  /** Open payment doc + saved Z-Credit token — pay in-app without opening hosted page. */
  payWithSavedCardAvailable?: boolean;
}

export interface BillingOverview {
  payments: PaymentRecord[];
  subscriptions: SubscriptionRecord[];
  offers: OfferRecord[];
  pendingPayments?: PendingPaymentAction[] | null;
  billingPortalAvailable?: boolean;
}

export interface CardInfo {
  holderName: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
}

export interface IBillingService {
  fetchOverview(accountId: string): Promise<BillingOverview>;
  getCard(accountId: string): Promise<CardInfo | null>;
  deleteCard(accountId: string): Promise<void>;
  /** Charge the open admin payment doc with the saved Z-Credit token. */
  payOpenInvoice(accountId: string): Promise<{ status: string; hostedInvoiceUrl?: string | null }>;
}

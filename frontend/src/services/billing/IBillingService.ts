import type {
  OfferRecord,
  PaymentRecord,
  SubscriptionRecord,
} from "@/domain/Billing";
import type { ContractMemberRow } from "@/domain/Contract";

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
  summary: string;
  payUrl: string | null;
  lineItems?: PendingPaymentLineItem[] | null;
  installmentTotalAmount?: number | null;
  installmentMonths?: number | null;
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

export interface HostedCheckoutRequest {
  accountId: number;
  amount: number;
  currency: string;
  description: string;
}

export interface HostedCheckoutResponse {
  status: string;
  message: string;
  gateway: string;
  callbackUrl: string;
  sessionId?: string | null;
  paymentUrl?: string | null;
}

export interface IBillingService {
  fetchAccountContracts(accountId: string): Promise<ContractMemberRow[]>;
  fetchOverview(accountId: string): Promise<BillingOverview>;
  getCard(accountId: string): Promise<CardInfo | null>;
  deleteCard(accountId: string): Promise<void>;
  payOpenInvoice(accountId: string): Promise<{ status: string; hostedInvoiceUrl?: string | null }>;
  createHostedCheckout(body: HostedCheckoutRequest): Promise<HostedCheckoutResponse>;
  submitContractAcceptance(
    accountId: string,
    body: { paymentActionId: string; signaturePngBase64: string },
  ): Promise<{ id: number; createdAt: string }>;
}

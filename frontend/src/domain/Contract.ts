export type ContractPaymentStatus = "unpaid" | "invoiced" | "partial" | "paid";

export interface ContractStage {
  id: number;
  sortOrder: number;
  description: string;
  amount: number;
  status: "pending" | "invoiced" | "paid";
  paidAt?: string | null;
  /** "subscription" activates recurring billing when paid; "one_time" is a plain fee. */
  kind?: "subscription" | "one_time";
}

export interface Contract {
  id: number;
  accountId: number;
  title: string;
  body: string;
  totalAmount: number;
  currency: string;
  status: "draft" | "pending_signature" | "signed" | "voided";
  signToken: string;
  signedAt: string | null;
  signerName: string | null;
  signerPosition?: string | null;
  signedCopyEmail?: string | null;
  signaturePngBase64: string | null;
  pdfBase64: string | null;
  createdAt: string;
  stages: ContractStage[];
  billingInstructionId?: number | null;
  monthlyAmount?: number | null;
  subscriptionMonths?: number | null;
  billingDay?: number | null;
  /** Derived from the stages — never stored, so it cannot drift. */
  paymentStatus?: ContractPaymentStatus;
  /** Whole-contract worth: monthly x months + fees. Null when open-ended. */
  contractValue?: number | null;
}

export interface ContractPublic {
  id: number;
  title: string;
  body: string;
  totalAmount: number;
  currency: string;
  status: string;
  signedAt: string | null;
  signerName: string | null;
  pdfBase64: string | null;
  stages: ContractStage[];
  monthlyAmount?: number | null;
  subscriptionStatus?: string | null;
  paymentStatus?: ContractPaymentStatus;
  contractValue?: number | null;
}

export interface ContractStageInput {
  description: string;
  amount: number;
}

export interface ContractCreateInput {
  accountId: number;
  title: string;
  body: string;
  currency: string;
  pdfBase64?: string | null;
  stages: ContractStageInput[];
  isSubscription?: boolean;
  monthlyAmount?: number | null;
  subscriptionMonths?: number | null;
  billingDay?: number | null;
}

export interface ContractMemberRow {
  id: number;
  title: string;
  totalAmount: number;
  currency: string;
  status: Contract["status"];
  signToken: string;
  signedAt: string | null;
  signerName: string | null;
  createdAt: string;
  stages: ContractStage[];
  monthlyAmount?: number | null;
  subscriptionMonths?: number | null;
}

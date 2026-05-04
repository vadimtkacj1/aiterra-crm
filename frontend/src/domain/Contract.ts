export interface ContractStage {
  id: number;
  sortOrder: number;
  description: string;
  amount: number;
  status: "pending" | "invoiced" | "paid";
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
}

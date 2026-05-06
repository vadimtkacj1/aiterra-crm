import type { Env } from "../../config/Env";
import type { ContractMemberRow } from "../../domain/Contract";
import type { HttpClient } from "../../infrastructure/HttpClient";
import type {
  BillingOverview,
  CardInfo,
  HostedCheckoutRequest,
  HostedCheckoutResponse,
  IBillingService,
} from "./IBillingService";

export class BillingService implements IBillingService {
  constructor(
    private readonly env: Env,
    private readonly http: HttpClient,
  ) {}

  private base(accountId: string): string {
    const b = this.env.billingApiUrl;
    return b ? `${b}/accounts/${accountId}` : `/accounts/${accountId}`;
  }

  fetchAccountContracts(accountId: string): Promise<ContractMemberRow[]> {
    return this.http.get<ContractMemberRow[]>(`${this.base(accountId)}/contracts`);
  }

  fetchOverview(accountId: string): Promise<BillingOverview> {
    return this.http.get<BillingOverview>(`${this.base(accountId)}/billing/overview`);
  }

  async getCard(accountId: string): Promise<CardInfo | null> {
    try {
      const data = await this.http.get<CardInfo | null>(
        `${this.base(accountId)}/billing/card`,
      );
      return data ?? null;
    } catch {
      return null;
    }
  }

  async deleteCard(accountId: string): Promise<void> {
    await this.http.delete(`${this.base(accountId)}/billing/card`);
  }

  payOpenInvoice(accountId: string): Promise<{ status: string; hostedInvoiceUrl?: string | null }> {
    return this.http.post<{ status: string; hostedInvoiceUrl?: string | null }>(
      `${this.base(accountId)}/billing/pay-invoice`,
      {},
    );
  }

  createHostedCheckout(body: HostedCheckoutRequest): Promise<HostedCheckoutResponse> {
    const b = this.env.billingApiUrl;
    const url = b ? `${b}/checkout` : "/checkout";
    return this.http.post<HostedCheckoutResponse>(url, body);
  }

  submitContractAcceptance(
    accountId: string,
    body: { paymentActionId: string; signaturePngBase64: string },
  ): Promise<{ id: number; createdAt: string }> {
    return this.http.post<{ id: number; createdAt: string }>(
      `${this.base(accountId)}/billing/contract-acceptance`,
      body,
    );
  }
}

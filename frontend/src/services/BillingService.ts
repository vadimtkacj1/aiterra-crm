import type { Env } from "../config/Env";
import type { HttpClient } from "../infrastructure/HttpClient";
import type {
  BillingOverview,
  CardInfo,
  IBillingService,
} from "./interfaces/IBillingService";

export class BillingService implements IBillingService {
  constructor(
    private readonly env: Env,
    private readonly http: HttpClient,
  ) {}

  private base(accountId: string): string {
    const b = this.env.billingApiUrl;
    return b ? `${b}/accounts/${accountId}` : `/accounts/${accountId}`;
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
}

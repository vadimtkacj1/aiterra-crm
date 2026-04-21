import type { HttpClient } from "../infrastructure/HttpClient";

export interface AdminAccountRow {
  id: number;
  name: string;
  membersCount: number;
}

export interface CreateAccountInput {
  name: string;
  metaCampaignId?: string;
  metaCampaignName?: string;
}

/** First owner business + linked Meta campaign (admin). */
export interface UserBusinessMeta {
  accountId: number | null;
  metaCampaignId: string | null;
  metaCampaignName: string | null;
}

/** Google Ads link for owner business (admin) — tokens are write-only. */
export interface UserBusinessGoogle {
  accountId: number | null;
  customerId: string | null;
  loginCustomerId: string | null;
  hasCredentials: boolean;
}

export interface AdminStats {
  usersTotal: number;
  adminsTotal: number;
  regularUsersTotal: number;
  accountsTotal: number;
  trackedCampaignsTotal: number;
  metaConnected: boolean;
}

export interface AdminPaymentCurrencySummary {
  currency: string;
  paidAmount: number;
  unpaidAmount: number;
}

export interface AdminPaymentStatsBucket {
  label: string;
  paidCount: number;
  unpaidCount: number;
}

export interface AdminPaymentStats {
  paidCount: number;
  unpaidCount: number;
  availableYears: number[];
  currencies: AdminPaymentCurrencySummary[];
  buckets: AdminPaymentStatsBucket[];
}

export interface AdminAuditLogRow {
  id: number;
  createdAt: string;
  adminUserId: number | null;
  adminEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  detail: string | null;
}

export interface MetaTopupRecord {
  id: number;
  accountId: number;
  amount: number;
  currency: string;
  status: string;
  metaError: string | null;
  createdAt: string;
}

/** Admin-defined charge for this business: off, one-time Z-Credit payment, or monthly recurring billing. Amount in major units. */
export type AccountBillingChargeType = "none" | "one_time" | "monthly";

export interface BillingLineItem {
  code?: string;
  label: string;
  amount: number;
}

export interface AccountBillingInstruction {
  chargeType: AccountBillingChargeType;
  amount: number | null;
  currency: string;
  description: string | null;
  lineItems?: BillingLineItem[] | null;
}

/** Saved invoice definition — no client until applied (POST …/apply/:accountId). */
export interface InvoiceTemplateRow {
  id: number;
  title: string | null;
  chargeType: "one_time" | "monthly";
  amount: number;
  currency: string;
  description: string | null;
  lineItems?: BillingLineItem[] | null;
  createdAt: string;
}

export interface InvoiceTemplateCreateInput {
  title?: string | null;
  chargeType: "one_time" | "monthly";
  amount: number;
  currency: string;
  description?: string | null;
  lineItems?: BillingLineItem[] | null;
}

export type BillingHistoryRecordStatus = "active" | "superseded" | "revoked";

/** paid | unpaid | voided | cancelled | superseded | ongoing | unknown */
export type BillingHistoryPaymentStatus =
  | "paid"
  | "unpaid"
  | "voided"
  | "cancelled"
  | "superseded"
  | "ongoing"
  | "unknown";

/** Admin log row for Z-Credit payments / recurring billings created for a business. */
export interface BillingHistoryRow {
  id: number;
  chargeType: "one_time" | "monthly";
  amount: number | null;
  currency: string;
  description: string | null;
  lineItems?: BillingLineItem[] | null;
  paymentDocId: string | null;
  paymentUrl: string | null;
  paymentRecurringId: string | null;
  recordStatus: BillingHistoryRecordStatus;
  paymentDocStatus: string | null;
  paymentRecurringStatus: string | null;
  paymentStatus: BillingHistoryPaymentStatus;
  createdAt: string;
  closedAt: string | null;
  isCurrent: boolean;
}

/** Global admin list: billing row + business (no user filter on this list). */
export interface BillingHistoryWithAccountRow extends BillingHistoryRow {
  accountId: number;
  accountName: string;
  ownerEmail: string | null;
}

export class AdminService {
  constructor(private readonly http: HttpClient) {}

  async listAccounts(): Promise<AdminAccountRow[]> {
    return this.http.get<AdminAccountRow[]>("/admin/accounts");
  }

  async createAccount(input: CreateAccountInput): Promise<{ id: number; name: string }> {
    return this.http.post<{ id: number; name: string }>("/admin/accounts", input);
  }

  async assignMember(accountId: number, userId: number, roleInAccount: "owner" | "member" = "member"): Promise<void> {
    await this.http.post("/admin/accounts/" + accountId + "/members", { userId, roleInAccount });
  }

  async getStats(): Promise<AdminStats> {
    return this.http.get<AdminStats>("/admin/stats");
  }

  async getPaymentStats(params?: {
    startDate?: string;
    endDate?: string;
    year?: number;
    groupBy?: "day" | "month" | "year";
  }): Promise<AdminPaymentStats> {
    const search = new URLSearchParams();
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.year != null) search.set("year", String(params.year));
    if (params?.groupBy) search.set("groupBy", params.groupBy);
    const qs = search.toString();
    return this.http.get<AdminPaymentStats>(`/admin/stats/payments${qs ? `?${qs}` : ""}`);
  }

  async listTopups(): Promise<MetaTopupRecord[]> {
    return this.http.get<MetaTopupRecord[]>("/admin/billing/topups");
  }

  /**
   * GET /admin/accounts/:accountId/billing-instruction
   * Current admin rule for this business (shown in edit-user form).
   */
  async getAccountBillingInstruction(accountId: number): Promise<AccountBillingInstruction> {
    return this.http.get<AccountBillingInstruction>(`/admin/accounts/${accountId}/billing-instruction`);
  }

  /**
   * PUT /admin/accounts/:accountId/billing-instruction
   * Body: { chargeType, amount, currency, description }
   * - none: clear instruction (amount null).
   * - one_time: backend creates a Z-Credit payment page and exposes pay URL in customer billing overview.
   * - monthly: backend creates a Z-Credit recurring billing; customer pays via hosted link; no admin card charge.
   */
  async setAccountBillingInstruction(
    accountId: number,
    input: AccountBillingInstruction,
  ): Promise<AccountBillingInstruction> {
    return this.http.put<AccountBillingInstruction>(`/admin/accounts/${accountId}/billing-instruction`, input);
  }

  async listInvoiceTemplates(): Promise<InvoiceTemplateRow[]> {
    return this.http.get<InvoiceTemplateRow[]>("/admin/invoice-templates");
  }

  async createInvoiceTemplate(input: InvoiceTemplateCreateInput): Promise<InvoiceTemplateRow> {
    return this.http.post<InvoiceTemplateRow>("/admin/invoice-templates", input);
  }

  async deleteInvoiceTemplate(templateId: number): Promise<void> {
    await this.http.delete(`/admin/invoice-templates/${templateId}`);
  }

  /** Create Z-Credit charge for this business from a saved template. */
  async applyInvoiceTemplate(templateId: number, accountId: number): Promise<AccountBillingInstruction> {
    return this.http.post<AccountBillingInstruction>(
      `/admin/invoice-templates/${templateId}/apply/${accountId}`,
      {},
    );
  }

  /** GET /admin/billing-history — all businesses; paid/unpaid derived per row. */
  async listAllBillingHistory(): Promise<BillingHistoryWithAccountRow[]> {
    return this.http.get<BillingHistoryWithAccountRow[]>("/admin/billing-history");
  }

  /** GET /admin/accounts/:accountId/billing-history — recent client invoice / subscription actions. */
  async listAccountBillingHistory(accountId: number): Promise<BillingHistoryRow[]> {
    return this.http.get<BillingHistoryRow[]>(`/admin/accounts/${accountId}/billing-history`);
  }

  /** POST — void open invoice / cancel subscription and clear live instruction if it matches. */
  async revokeBillingHistoryRow(accountId: number, historyId: number): Promise<BillingHistoryRow> {
    return this.http.post<BillingHistoryRow>(`/admin/accounts/${accountId}/billing-history/${historyId}/revoke`);
  }

  /** DELETE — remove row from admin history (only after revoke or supersede). */
  async deleteBillingHistoryRow(accountId: number, historyId: number): Promise<void> {
    await this.http.delete(`/admin/accounts/${accountId}/billing-history/${historyId}`);
  }

  async getUserBusinessMeta(userId: string): Promise<UserBusinessMeta> {
    return this.http.get<UserBusinessMeta>(`/admin/users/${userId}/business-meta`);
  }

  async setUserBusinessMeta(
    userId: string,
    input: { metaCampaignId?: string | null; metaCampaignName?: string | null },
  ): Promise<UserBusinessMeta> {
    return this.http.put<UserBusinessMeta>(`/admin/users/${userId}/business-meta`, input);
  }

  async getUserBusinessGoogle(userId: string): Promise<UserBusinessGoogle> {
    return this.http.get<UserBusinessGoogle>(`/admin/users/${userId}/business-google`);
  }

  async setUserBusinessGoogle(
    userId: string,
    input: {
      customerId?: string | null;
      developerToken?: string | null;
      refreshToken?: string | null;
      loginCustomerId?: string | null;
    },
  ): Promise<UserBusinessGoogle> {
    return this.http.put<UserBusinessGoogle>(`/admin/users/${userId}/business-google`, input);
  }

  async listAuditLogs(limit = 200): Promise<AdminAuditLogRow[]> {
    return this.http.get<AdminAuditLogRow[]>(`/admin/audit-logs?limit=${limit}`);
  }

  async downloadExecutivePdf(params?: { startDate?: string; endDate?: string }): Promise<Blob> {
    const search = new URLSearchParams();
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    const qs = search.toString();
    return this.http.getBlob(`/admin/reports/executive.pdf${qs ? `?${qs}` : ""}`);
  }

  async exportUsersCsv(): Promise<Blob> {
    return this.http.getBlob("/admin/export/users.csv");
  }

  async exportBillingHistoryCsv(): Promise<Blob> {
    return this.http.getBlob("/admin/export/billing-history.csv");
  }
}

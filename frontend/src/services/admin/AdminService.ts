import type { HttpClient } from "@/infrastructure/HttpClient";
import type { Contract, ContractCreateInput } from "@/domain/Contract";
import type { SiteLeadAdmin } from "@/domain/Site";

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

export interface UserBusinessMeta {
  accountId: number | null;
  metaCampaignId: string | null;
  metaCampaignName: string | null;
}

export interface UserBusinessGoogle {
  accountId: number | null;
  customerId: string | null;
  loginCustomerId: string | null;
  hasCredentials: boolean;
}

export interface UserBusinessSite {
  accountId: number | null;
  hasSite: boolean;
  siteUrl?: string | null;
  publicToken?: string | null;
  notifyChannel?: string | null;
  waOwnerPhone?: string | null;
  waNotifyMessage?: string | null;
  emailNotifySubject?: string | null;
  emailNotifyMessage?: string | null;
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
  paymentUrl?: string | null;
  installmentMonths?: number | null;
  installmentTotalAmount?: number | null;
  splitAcrossMonths?: number | null;
  billingDay?: number | null;
  billingWeekDay?: number | null;
  testIntervalMinutes?: number | null;
}

export interface InvoiceTemplateRow {
  id: number;
  title: string | null;
  chargeType: "one_time" | "monthly";
  amount: number;
  currency: string;
  description: string | null;
  lineItems?: BillingLineItem[] | null;
  createdAt: string;
  installmentMonths?: number | null;
  billingDay?: number | null;
}

export interface InvoiceTemplateCreateInput {
  title?: string | null;
  chargeType: "one_time" | "monthly";
  amount: number;
  currency: string;
  description?: string | null;
  lineItems?: BillingLineItem[] | null;
  splitAcrossMonths?: number | null;
}

export interface SubscriptionPayment {
  id: number;
  payment_number: number;
  amount: number;
  currency: string;
  status: string;
  paid_at: string;
  expected_date: string | null;
  zcredit_transaction_id: string | null;
}

export interface SubscriptionStatus {
  contract_id: number;
  contract_title: string;
  monthly_amount: number;
  currency: string;
  subscription_months: number | null;
  subscription_status: string | null;
  started_at: string | null;
  next_payment_date: string | null;
  payments_made: number;
  payments_remaining: number | null;
  total_paid: number;
  billing_day: number | null;
  test_interval_minutes: number | null;
  payments: SubscriptionPayment[];
}

export type BillingHistoryRecordStatus = "active" | "superseded" | "revoked";

export type BillingHistoryPaymentStatus =
  | "paid"
  | "unpaid"
  | "voided"
  | "cancelled"
  | "superseded"
  | "ongoing"
  | "unknown";

export interface BillingHistoryRow {
  id: number;
  chargeType: "one_time" | "monthly";
  amount: number | null;
  currency: string;
  description: string | null;
  lineItems?: BillingLineItem[] | null;
  installmentMonths?: number | null;
  installmentTotalAmount?: number | null;
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
  billingDay?: number | null;
}

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

  async getAccountBillingInstruction(accountId: number): Promise<AccountBillingInstruction> {
    return this.http.get<AccountBillingInstruction>(`/admin/accounts/${accountId}/billing-instruction`);
  }

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

  async applyInvoiceTemplate(templateId: number, accountId: number): Promise<AccountBillingInstruction> {
    return this.http.post<AccountBillingInstruction>(
      `/admin/invoice-templates/${templateId}/apply/${accountId}`,
      {},
    );
  }

  async listAllBillingHistory(): Promise<BillingHistoryWithAccountRow[]> {
    return this.http.get<BillingHistoryWithAccountRow[]>("/admin/billing-history");
  }

  async listAccountBillingHistory(accountId: number): Promise<BillingHistoryRow[]> {
    return this.http.get<BillingHistoryRow[]>(`/admin/accounts/${accountId}/billing-history`);
  }

  async revokeBillingHistoryRow(accountId: number, historyId: number): Promise<BillingHistoryRow> {
    return this.http.post<BillingHistoryRow>(`/admin/accounts/${accountId}/billing-history/${historyId}/revoke`);
  }

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

  async getUserBusinessSite(userId: string): Promise<UserBusinessSite> {
    return this.http.get<UserBusinessSite>(`/admin/users/${userId}/business-site`);
  }

  async setUserBusinessSite(
    userId: string,
    payload: {
      hasSite: boolean;
      siteUrl?: string | null;
      notifyChannel?: string | null;
      waNotifyMessage?: string | null;
      emailNotifySubject?: string | null;
      emailNotifyMessage?: string | null;
    },
  ): Promise<UserBusinessSite> {
    return this.http.put<UserBusinessSite>(`/admin/users/${userId}/business-site`, payload);
  }

  async deleteUser(userId: number): Promise<void> {
    return this.http.delete(`/admin/users/${userId}`);
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

  async listContracts(accountId?: number): Promise<Contract[]> {
    const qs = accountId != null ? `?account_id=${accountId}` : "";
    return this.http.get<Contract[]>(`/admin/contracts${qs}`);
  }

  async getContract(id: number): Promise<Contract> {
    return this.http.get<Contract>(`/admin/contracts/${id}`);
  }

  async createContract(input: ContractCreateInput): Promise<Contract> {
    const payload = {
      accountId: input.accountId,
      title: input.title,
      body: input.body,
      currency: input.currency,
      pdfBase64: input.pdfBase64 ?? null,
      stages: input.stages.map((s) => ({ description: s.description, amount: s.amount })),
      isSubscription: input.isSubscription ?? false,
      monthlyAmount: input.monthlyAmount ?? null,
      subscriptionMonths: input.subscriptionMonths ?? null,
      billingDay: input.billingDay ?? null,
    };
    return this.http.post<Contract>("/admin/contracts", payload);
  }

  async sendContract(id: number): Promise<Contract> {
    return this.http.post<Contract>(`/admin/contracts/${id}/send`, {});
  }

  async voidContract(id: number): Promise<Contract> {
    return this.http.post<Contract>(`/admin/contracts/${id}/void`, {});
  }

  async deleteContract(id: number): Promise<void> {
    return this.http.delete(`/admin/contracts/${id}`);
  }

  async getContractSubscriptionStatus(contractId: number): Promise<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>(`/subscriptions/contracts/${contractId}/subscription`);
  }

  async simulateMonthlyPayment(contractId: number): Promise<{ success: boolean; payment_number: number; amount: number; currency: string; message: string }> {
    return this.http.post(`/subscriptions/contracts/${contractId}/subscription/simulate-payment`, {});
  }

  async updateContractBillingDay(contractId: number, billingDay: number | null): Promise<SubscriptionStatus> {
    return this.http.patch<SubscriptionStatus>(`/subscriptions/contracts/${contractId}/subscription/billing-day`, { billing_day: billingDay });
  }

  async pauseSubscription(contractId: number): Promise<SubscriptionStatus> {
    return this.http.patch<SubscriptionStatus>(`/subscriptions/contracts/${contractId}/subscription/pause`, {});
  }

  async resumeSubscription(contractId: number): Promise<SubscriptionStatus> {
    return this.http.patch<SubscriptionStatus>(`/subscriptions/contracts/${contractId}/subscription/resume`, {});
  }

  async cancelSubscription(contractId: number): Promise<SubscriptionStatus> {
    return this.http.patch<SubscriptionStatus>(`/subscriptions/contracts/${contractId}/subscription/cancel`, {});
  }

  async setTestInterval(contractId: number, minutes: number | null): Promise<SubscriptionStatus> {
    return this.http.patch<SubscriptionStatus>(`/subscriptions/contracts/${contractId}/subscription/test-interval`, { minutes });
  }

  async listAllLeads(accountId?: number): Promise<SiteLeadAdmin[]> {
    const qs = accountId != null ? `?account_id=${accountId}` : "";
    return this.http.get<SiteLeadAdmin[]>(`/admin/leads${qs}`);
  }
}

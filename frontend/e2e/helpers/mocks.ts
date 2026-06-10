import type { Page, Route } from '@playwright/test';

// ─── Shared mock data ────────────────────────────────────────────────────────

export const CONTRACT_TOKEN = 'test-token-abc';

interface MockContractStage {
  id: number;
  sortOrder: number;
  description: string;
  amount: number;
  status: string;
  paidAt: string | null;
}

interface MockContract {
  id: number;
  title: string;
  body: string;
  totalAmount: number;
  currency: string;
  status: string;
  signedAt: string | null;
  signerName: string | null;
  pdfBase64: string | null;
  stages: MockContractStage[];
}

export const mockContract: MockContract = {
  id: 1,
  title: 'Service Agreement',
  body: 'These are the contract terms and conditions.',
  totalAmount: 5000,
  currency: 'ILS',
  status: 'pending_signature',
  signedAt: null,
  signerName: null,
  pdfBase64: null,
  stages: [
    { id: 1, sortOrder: 0, description: 'First payment', amount: 2500, status: 'pending', paidAt: null },
    { id: 2, sortOrder: 1, description: 'Second payment', amount: 2500, status: 'pending', paidAt: null },
  ],
};

export const mockSignedContract: MockContract = {
  ...mockContract,
  status: 'signed',
  signedAt: new Date().toISOString(),
  signerName: 'John Doe',
};

export const mockAdminContract = {
  id: 1,
  accountId: 10,
  title: 'Service Agreement',
  body: 'Terms here.',
  totalAmount: 5000,
  currency: 'ILS',
  status: 'draft',
  signToken: CONTRACT_TOKEN,
  signedAt: null,
  signerName: null,
  signerPosition: null,
  signedCopyEmail: null,
  signaturePngBase64: null,
  pdfBase64: null,
  createdAt: '2026-01-01T00:00:00Z',
  stages: [
    { id: 1, sortOrder: 0, description: 'Payment 1', amount: 5000, status: 'pending', paidAt: null },
  ],
  billingInstructionId: null,
  monthlyAmount: null,
  subscriptionMonths: null,
  billingDay: null,
};

// ─── Route mock helpers ──────────────────────────────────────────────────────

export async function mockLoginSuccess(page: Page) {
  await page.route('/api/auth/login', (route: Route) =>
    route.fulfill({
      json: {
        accessToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InVzZXIiLCJleHAiOjk5OTk5OTk5OTl9.fakesig',
        user: { id: 1, email: 'user@test.com', displayName: 'Test User', role: 'user' },
      },
    }),
  );
}

export async function mockLoginFail(page: Page) {
  await page.route('/api/auth/login', (route: Route) =>
    route.fulfill({ status: 401, json: { detail: 'invalid_credentials' } }),
  );
}

export async function mockAccountsList(page: Page) {
  await page.route('/api/accounts', (route: Route) =>
    route.fulfill({
      json: [{ id: 10, name: 'Test Business', hasMeta: false }],
    }),
  );
}

export async function mockAdminUsers(page: Page) {
  await page.route('/api/admin/users', (route: Route) =>
    route.fulfill({ json: [] }),
  );
}

export async function mockContractGet(page: Page, contract = mockContract) {
  await page.route(`/api/contracts/${CONTRACT_TOKEN}`, (route: Route) =>
    route.fulfill({ json: contract }),
  );
}

export async function mockContractSign(page: Page, response = mockSignedContract) {
  await page.route(`/api/contracts/${CONTRACT_TOKEN}/sign`, (route: Route) =>
    route.fulfill({ json: response }),
  );
}

export async function mockContractCheckout(page: Page) {
  await page.route(`/api/contracts/${CONTRACT_TOKEN}/checkout`, (route: Route) =>
    route.fulfill({
      json: {
        status: 'ok',
        message: 'Open paymentUrl in the browser to complete payment.',
        gateway: 'zcredit',
        callbackUrl: 'http://localhost:5173/api/webhooks/zcredit',
        sessionId: 'session-123',
        paymentUrl: 'https://pay.example.com/session-123',
        stage: {
          id: 1,
          sortOrder: 0,
          description: 'First payment',
          amount: 2500,
          status: 'invoiced',
          paidAt: null,
        },
      },
    }),
  );
}

export async function mockAdminContractsList(page: Page, list = [mockAdminContract]) {
  await page.route('/api/admin/contracts', (route: Route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: list });
    }
    return route.fulfill({ json: { ...mockAdminContract, id: 99 } });
  });
}

export async function mockAdminContractSend(page: Page, id = 1) {
  await page.route(`/api/admin/contracts/${id}/send`, (route: Route) =>
    route.fulfill({ json: { ...mockAdminContract, id, status: 'pending_signature' } }),
  );
}

export async function mockAdminContractVoid(page: Page, id = 1) {
  await page.route(`/api/admin/contracts/${id}/void`, (route: Route) =>
    route.fulfill({ json: { ...mockAdminContract, id, status: 'voided' } }),
  );
}

export async function mockBillingOverview(page: Page, accountId = '10') {
  await page.route(`/api/accounts/${accountId}/billing/overview`, (route: Route) =>
    route.fulfill({
      json: {
        pendingPayments: [
          {
            id: 'inv_1',
            amount: 1000,
            currency: 'ILS',
            summary: 'Monthly subscription',
            dueDate: null,
          },
        ],
        subscriptions: [],
        paymentHistory: [],
        savedCard: null,
      },
    }),
  );
}

export async function mockHostedCheckout(page: Page) {
  await page.route('/api/checkout', (route: Route) =>
    route.fulfill({
      json: {
        status: 'ok',
        message: 'Open paymentUrl in the browser to complete payment.',
        gateway: 'zcredit',
        callbackUrl: 'http://localhost:5173/api/webhooks/zcredit',
        sessionId: 'session-456',
        paymentUrl: 'https://pay.example.com/session-456',
      },
    }),
  );
}

// ─── Admin users (with data) ─────────────────────────────────────────────────

export const mockAdminUserEntry = {
  id: 2,
  email: 'client@test.com',
  displayName: 'Client User',
  role: 'user' as const,
  phone: '+972-50-1234567',
  accountId: 10,
};

export async function mockAdminUsersWithData(page: Page, users = [mockAdminUserEntry]) {
  await page.route('/api/admin/users', (route: Route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: users });
    }
    return route.fulfill({ json: { ...mockAdminUserEntry, id: 99 } });
  });
}

export async function mockAdminUserDelete(page: Page, id = 2) {
  await page.route(`/api/admin/users/${id}`, (route: Route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 204 });
    }
    return route.continue();
  });
}

// ─── Admin stats ─────────────────────────────────────────────────────────────

export const mockStatsData = {
  usersTotal: 50,
  adminsTotal: 3,
  regularUsersTotal: 47,
  accountsTotal: 45,
  trackedCampaignsTotal: 12,
};

export const mockPaymentStatsData = {
  paidCount: 25,
  unpaidCount: 8,
  currencies: [{ currency: 'ILS', totalPaid: 15000 }],
};

export async function mockAdminStats(page: Page) {
  await page.route('/api/admin/stats', (route: Route) =>
    route.fulfill({ json: mockStatsData }),
  );
}

export async function mockAdminPaymentStats(page: Page) {
  await page.route('**/api/admin/stats/payments**', (route: Route) =>
    route.fulfill({ json: mockPaymentStatsData }),
  );
}

// ─── Admin leads ─────────────────────────────────────────────────────────────

export const mockLeadEntry = {
  id: 1,
  accountId: 10,
  accountName: 'Test Business',
  name: 'John Lead',
  phone: '+972-50-1234567',
  email: 'john@lead.com',
  message: 'Interested in your service',
  treatment: 'new',
  source: 'https://example.com',
  createdAt: '2026-01-01T00:00:00Z',
};

export async function mockAdminLeads(page: Page, leads = [mockLeadEntry]) {
  await page.route('**/api/admin/leads**', (route: Route) =>
    route.fulfill({ json: leads }),
  );
}

// ─── Admin audit logs ────────────────────────────────────────────────────────

export const mockAuditLogEntry = {
  id: 1,
  adminUserId: 1,
  adminEmail: 'admin@test.com',
  action: 'create_user',
  resourceType: 'user',
  resourceId: '2',
  detail: 'Created user client@test.com',
  createdAt: '2026-01-01T00:00:00Z',
};

export async function mockAdminAuditLogs(page: Page, logs = [mockAuditLogEntry]) {
  await page.route('**/api/admin/audit-logs**', (route: Route) =>
    route.fulfill({ json: logs }),
  );
}

// ─── Admin Meta topups ───────────────────────────────────────────────────────

export const mockTopupEntry = {
  id: 1,
  accountId: 10,
  amount: 500,
  currency: 'USD',
  status: 'sent_to_meta',
  metaError: null,
  createdAt: '2026-01-01T00:00:00Z',
};

export async function mockAdminTopups(page: Page, topups = [mockTopupEntry]) {
  await page.route('/api/admin/billing/topups', (route: Route) =>
    route.fulfill({ json: topups }),
  );
}

// ─── Admin accounts list ─────────────────────────────────────────────────────

export const mockAdminAccountEntry = {
  id: 10,
  name: 'Test Business',
  ownerEmail: 'user@test.com',
};

export async function mockAdminAccounts(page: Page, accounts = [mockAdminAccountEntry]) {
  await page.route('/api/admin/accounts', (route: Route) =>
    route.fulfill({ json: accounts }),
  );
}

// ─── Admin billing history (all) ─────────────────────────────────────────────

export const mockAdminBillingHistoryEntry = {
  id: 1,
  accountId: 10,
  accountName: 'Test Business',
  ownerEmail: 'user@test.com',
  chargeType: 'one_time',
  amount: 1000,
  currency: 'ILS',
  paymentStatus: 'pending',
  recordStatus: 'active',
  description: 'Monthly fee',
  invoiceId: 'inv_001',
  createdAt: '2026-01-01T00:00:00Z',
};

export async function mockAdminBillingHistory(page: Page, rows = [mockAdminBillingHistoryEntry]) {
  await page.route('**/api/admin/billing-history**', (route: Route) =>
    route.fulfill({ json: rows }),
  );
}

// ─── Account billing history (user) ─────────────────────────────────────────

export const mockAccountBillingHistoryEntry = {
  id: 1,
  description: 'October billing',
  chargeType: 'monthly',
  amount: 1500,
  currency: 'ILS',
  paymentStatus: 'paid',
  invoiceId: 'inv_001',
  createdAt: '2026-01-01T00:00:00Z',
};

export async function mockAccountBillingHistory(
  page: Page,
  accountId = '10',
  rows = [mockAccountBillingHistoryEntry],
) {
  await page.route(`/api/accounts/${accountId}/billing/history`, (route: Route) =>
    route.fulfill({ json: rows }),
  );
}

// ─── Meta billing (for billing page MetaBillingCard) ─────────────────────────

export async function mockMetaBilling(page: Page, accountId = '10') {
  await page.route(`/api/meta/billing/${accountId}`, (route: Route) =>
    route.fulfill({
      json: {
        accountId: 'act_123',
        accountName: 'Test Meta Account',
        accountStatus: 1,
        amountSpent: '500.00',
        balance: '1000.00',
        spendCap: '5000.00',
        currency: 'USD',
        transactions: [],
      },
    }),
  );
}

// ─── Change password ─────────────────────────────────────────────────────────

export async function mockChangePassword(page: Page) {
  await page.route('/api/auth/change-password', (route: Route) =>
    route.fulfill({ status: 200, json: { message: 'Password changed' } }),
  );
}

export async function mockChangePasswordFail(page: Page) {
  await page.route('/api/auth/change-password', (route: Route) =>
    route.fulfill({ status: 400, json: { detail: 'wrong_password' } }),
  );
}

// ─── Invoice templates (admin payments) ──────────────────────────────────────

export async function mockAdminInvoiceTemplates(page: Page) {
  await page.route('/api/admin/invoice-templates', (route: Route) =>
    route.fulfill({ json: [] }),
  );
}

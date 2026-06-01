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

import { expect, test } from '@playwright/test';
import { injectAuth, FAKE_USER } from '../helpers/auth';
import {
  mockAccountBillingHistory,
  mockAccountBillingHistoryEntry,
  mockAccountsList,
  mockBillingOverview,
  mockMetaBilling,
} from '../helpers/mocks';
import { BillingPage } from '../pages/BillingPage';

const ACCOUNT_ID = '10';

// Pending payment with payUrl set — causes PendingInvoicePanel to render the Pay Now button.
// Without payUrl the panel shows a refresh/loading state instead.
const PENDING_WITH_PAY_URL = {
  id: 'inv_1',
  amount: 1000,
  currency: 'ILS',
  summary: 'Monthly subscription',
  dueDate: null,
  payUrl: 'https://pay.example.com/session-test',
};

test.describe('Billing overview page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, FAKE_USER);
    await mockAccountsList(page);
    await mockMetaBilling(page, ACCOUNT_ID);
    await mockAccountBillingHistory(page, ACCOUNT_ID);
  });

  test('shows pending payment card when a pending payment exists', async ({ page }) => {
    await mockBillingOverview(page, ACCOUNT_ID);

    const billingPage = new BillingPage(page);
    await billingPage.goto(ACCOUNT_ID);

    await expect(page.getByText('Payment required')).toBeVisible({ timeout: 8000 });
  });

  test('shows Pay Now button when payment URL is available', async ({ page }) => {
    await page.route(`/api/accounts/${ACCOUNT_ID}/billing/overview`, (route) =>
      route.fulfill({
        json: {
          pendingPayments: [PENDING_WITH_PAY_URL],
          subscriptions: [],
          paymentHistory: [],
          savedCard: null,
        },
      }),
    );

    const billingPage = new BillingPage(page);
    await billingPage.goto(ACCOUNT_ID);

    await expect(billingPage.payNowButton).toBeVisible({ timeout: 8000 });
  });

  test('billing history section shows history row', async ({ page }) => {
    await mockBillingOverview(page, ACCOUNT_ID);

    const billingPage = new BillingPage(page);
    await billingPage.goto(ACCOUNT_ID);

    await expect(
      page.getByText(mockAccountBillingHistoryEntry.description),
    ).toBeVisible({ timeout: 8000 });
  });

  test('no Pay Now button when no pending payments', async ({ page }) => {
    await page.route(`/api/accounts/${ACCOUNT_ID}/billing/overview`, (route) =>
      route.fulfill({
        json: { pendingPayments: [], subscriptions: [], paymentHistory: [], savedCard: null },
      }),
    );

    const billingPage = new BillingPage(page);
    await billingPage.goto(ACCOUNT_ID);

    await expect(billingPage.reloadButton).toBeVisible({ timeout: 8000 });
    await expect(billingPage.payNowButton).not.toBeVisible();
  });
});

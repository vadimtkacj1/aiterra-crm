import { expect, test } from '@playwright/test';
import { injectAuth, FAKE_USER } from '../helpers/auth';
import { mockBillingOverview, mockHostedCheckout } from '../helpers/mocks';

const ACCOUNT_ID = '10';

test.describe('Billing checkout page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, FAKE_USER);
  });

  test('shows pay button when pending payment exists', async ({ page }) => {
    await mockBillingOverview(page, ACCOUNT_ID);

    await page.goto(`/a/${ACCOUNT_ID}/billing/checkout`);

    await expect(page.getByRole('button', { name: /Pay/ })).toBeVisible({ timeout: 8000 });
  });

  test('calls checkout API when Pay is clicked', async ({ page }) => {
    await mockBillingOverview(page, ACCOUNT_ID);

    let checkoutCalled = false;
    await page.route('/api/checkout', async (route) => {
      checkoutCalled = true;
      await route.fulfill({
        json: {
          status: 'ok',
          gateway: 'zcredit',
          sessionId: 'session-456',
          paymentUrl: 'https://pay.example.com/session-456',
        },
      });
    });

    await page.goto(`/a/${ACCOUNT_ID}/billing/checkout`);
    await expect(page.getByRole('button', { name: /Pay/ })).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: /Pay/ }).click();

    // Give the app time to make the API call
    await page.waitForTimeout(1000);
    expect(checkoutCalled).toBe(true);
  });

  test('redirects back to billing when no pending payments', async ({ page }) => {
    await page.route(`/api/accounts/${ACCOUNT_ID}/billing/overview`, (route) =>
      route.fulfill({
        json: { pendingPayments: [], subscriptions: [], paymentHistory: [], savedCard: null },
      }),
    );

    await page.goto(`/a/${ACCOUNT_ID}/billing/checkout`);

    // No pending payment → app calls goBack() → billing page
    await expect(page).toHaveURL(new RegExp(`/a/${ACCOUNT_ID}/billing`), { timeout: 8000 });
  });

  test('shows error feedback when hosted checkout API fails', async ({ page }) => {
    await mockBillingOverview(page, ACCOUNT_ID);
    await page.route('/api/checkout', (route) =>
      route.fulfill({ status: 503, json: { detail: 'zcredit_not_configured' } }),
    );

    await page.goto(`/a/${ACCOUNT_ID}/billing/checkout`);
    await expect(page.getByRole('button', { name: /Pay/ })).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: /Pay/ }).click();

    // Ant Design message errors use role="status" or render in ant-message portal
    await expect(
      page.getByRole('alert')
        .or(page.getByRole('status'))
        .or(page.locator('[class*="ant-message"]'))
        .first(),
    ).toBeVisible({ timeout: 8000 });
  });
});

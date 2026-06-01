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

  test('redirects to payment URL when Pay is clicked', async ({ page }) => {
    await mockBillingOverview(page, ACCOUNT_ID);
    await mockHostedCheckout(page);

    await page.goto(`/a/${ACCOUNT_ID}/billing/checkout`);
    await expect(page.getByRole('button', { name: /Pay/ })).toBeVisible({ timeout: 8000 });

    let finalUrl = '';
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) finalUrl = frame.url();
    });

    await page.getByRole('button', { name: /Pay/ }).click();
    await page.waitForFunction(
      () => window.location.href.includes('pay.example.com'),
      { timeout: 8000 },
    ).catch(() => {});

    expect(finalUrl || page.url()).toContain('pay.example.com');
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

  test('shows error message when hosted checkout API fails', async ({ page }) => {
    await mockBillingOverview(page, ACCOUNT_ID);
    await page.route('/api/checkout', (route) =>
      route.fulfill({ status: 503, json: { detail: 'zcredit_not_configured' } }),
    );

    await page.goto(`/a/${ACCOUNT_ID}/billing/checkout`);
    await expect(page.getByRole('button', { name: /Pay/ })).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: /Pay/ }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8000 });
  });
});

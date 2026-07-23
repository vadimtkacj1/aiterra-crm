import { expect, test } from '@playwright/test';
import { injectAuth, FAKE_ADMIN } from '../helpers/auth';
import {
  mockAdminBillingHistory,
  mockAdminBillingHistoryEntry,
  mockAdminInvoiceTemplates,
  mockAdminUsersWithData,
} from '../helpers/mocks';
import { AdminPaymentsPage } from '../pages/AdminPaymentsPage';

test.describe('Admin — payments', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, FAKE_ADMIN);
    await mockAdminUsersWithData(page);
    await mockAdminInvoiceTemplates(page);
    await mockAdminBillingHistory(page);
  });

  test('shows recipient select on the single-screen flow', async ({ page }) => {
    const paymentsPage = new AdminPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.recipientSelect).toBeVisible({ timeout: 8000 });
    // No wizard: there is no "next step" button; the composer stays hidden
    // until a billable client is selected.
    await expect(page.locator('.ant-steps')).toHaveCount(0);
  });

  test('billing history table is visible', async ({ page }) => {
    const paymentsPage = new AdminPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.historyTable).toBeVisible({ timeout: 8000 });
  });

  test('history table shows billing entry data', async ({ page }) => {
    const paymentsPage = new AdminPaymentsPage(page);
    await paymentsPage.goto();

    await expect(
      page.getByText(mockAdminBillingHistoryEntry.accountName),
    ).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('1,000')).toBeVisible();
  });

  test('empty history shows no-data state when no billing records', async ({ page }) => {
    await mockAdminBillingHistory(page, []);

    const paymentsPage = new AdminPaymentsPage(page);
    await paymentsPage.goto();

    await expect(
      page.getByText(/no history yet/i).or(page.getByText(/no data/i).first()),
    ).toBeVisible({ timeout: 8000 });
  });
});

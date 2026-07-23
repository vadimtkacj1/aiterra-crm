import { expect, test } from '@playwright/test';
import { injectAuth, FAKE_ADMIN } from '../helpers/auth';
import {
  mockAdminBillingHistory,
  mockAdminBillingHistoryEntry,
  mockAdminUsers,
} from '../helpers/mocks';
import { AdminInvoicesPage } from '../pages/AdminInvoicesPage';

test.describe('Admin — invoices', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, FAKE_ADMIN);
    await mockAdminUsers(page);
  });

  test('lists invoice records in the table', async ({ page }) => {
    await mockAdminBillingHistory(page);

    const invoicesPage = new AdminInvoicesPage(page);
    await invoicesPage.goto();

    await expect(invoicesPage.invoicesTable).toBeVisible({ timeout: 8000 });
    await expect(
      page.getByText(mockAdminBillingHistoryEntry.ownerEmail),
    ).toBeVisible();
  });

  test('shows invoice amount and status badge', async ({ page }) => {
    await mockAdminBillingHistory(page);

    const invoicesPage = new AdminInvoicesPage(page);
    await invoicesPage.goto();

    await expect(page.getByText('1,000')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/pending/i).first()).toBeVisible();
  });

  test('Create button navigates to the payments wizard', async ({ page }) => {
    await mockAdminBillingHistory(page);

    const invoicesPage = new AdminInvoicesPage(page);
    await invoicesPage.goto();
    await invoicesPage.createButton.waitFor({ state: 'visible', timeout: 8000 });
    await invoicesPage.createButton.click();

    await expect(page).toHaveURL(/\/admin\/payments/, { timeout: 5000 });
  });

  test('shows empty state when no invoices exist', async ({ page }) => {
    await mockAdminBillingHistory(page, []);

    const invoicesPage = new AdminInvoicesPage(page);
    await invoicesPage.goto();

    await expect(
      page.getByText(/no invoices/i).or(page.getByText(/no data/i).first()),
    ).toBeVisible({ timeout: 8000 });
  });
});

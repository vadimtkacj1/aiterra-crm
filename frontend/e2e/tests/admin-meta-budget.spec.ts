import { expect, test } from '@playwright/test';
import { injectAuth, FAKE_ADMIN } from '../helpers/auth';
import {
  mockAdminAccounts,
  mockAdminTopups,
  mockAdminUsers,
  mockTopupEntry,
} from '../helpers/mocks';
import { AdminMetaBudgetPage } from '../pages/AdminMetaBudgetPage';

test.describe('Admin — Meta budget (topup history)', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, FAKE_ADMIN);
    await mockAdminUsers(page);
    await mockAdminAccounts(page);
  });

  test('shows topup table with entry data', async ({ page }) => {
    await mockAdminTopups(page);

    const metaBudgetPage = new AdminMetaBudgetPage(page);
    await metaBudgetPage.goto();

    await expect(metaBudgetPage.topupsTable).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('500')).toBeVisible();
    await expect(page.getByText('USD')).toBeVisible();
  });

  test('shows sent_to_meta status as success badge', async ({ page }) => {
    await mockAdminTopups(page);

    const metaBudgetPage = new AdminMetaBudgetPage(page);
    await metaBudgetPage.goto();

    await expect(
      page.getByText('sent_to_meta').or(page.getByText(/sent to meta/i)).first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test('failed topup shows error status', async ({ page }) => {
    await mockAdminTopups(page, [
      { ...mockTopupEntry, status: 'failed', metaError: 'Insufficient funds' },
    ]);

    const metaBudgetPage = new AdminMetaBudgetPage(page);
    await metaBudgetPage.goto();

    await expect(page.getByText(/failed/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('table shows no topup rows when empty', async ({ page }) => {
    await mockAdminTopups(page, []);

    const metaBudgetPage = new AdminMetaBudgetPage(page);
    await metaBudgetPage.goto();

    await expect(metaBudgetPage.topupsTable).toBeVisible({ timeout: 8000 });
    // No topup entries → amount from mock data should not appear
    await expect(page.getByText(String(mockTopupEntry.amount))).not.toBeVisible();
  });
});

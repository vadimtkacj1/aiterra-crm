import { expect, test } from '@playwright/test';
import { injectAuth, FAKE_ADMIN } from '../helpers/auth';
import {
  mockAdminAccounts,
  mockAdminLeads,
  mockAdminUsers,
  mockLeadEntry,
} from '../helpers/mocks';
import { AdminLeadsPage } from '../pages/AdminLeadsPage';

test.describe('Admin — leads', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, FAKE_ADMIN);
    await mockAdminUsers(page);
    await mockAdminAccounts(page);
  });

  test('shows leads table with lead data', async ({ page }) => {
    await mockAdminLeads(page);

    const leadsPage = new AdminLeadsPage(page);
    await leadsPage.goto();

    await expect(leadsPage.leadsTable).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(mockLeadEntry.name)).toBeVisible();
    await expect(page.getByText(mockLeadEntry.phone)).toBeVisible();
  });

  test('shows lead email and account name', async ({ page }) => {
    await mockAdminLeads(page);

    const leadsPage = new AdminLeadsPage(page);
    await leadsPage.goto();

    await expect(page.getByText(mockLeadEntry.email)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(mockLeadEntry.accountName)).toBeVisible();
  });

  test('account filter dropdown is visible', async ({ page }) => {
    await mockAdminLeads(page);

    const leadsPage = new AdminLeadsPage(page);
    await leadsPage.goto();

    await expect(leadsPage.accountFilter).toBeVisible({ timeout: 8000 });
  });

  test('shows empty state when no leads exist', async ({ page }) => {
    await mockAdminLeads(page, []);

    const leadsPage = new AdminLeadsPage(page);
    await leadsPage.goto();

    await expect(
      page.getByText(/no leads yet/i).or(page.getByText(/no data/i).first()),
    ).toBeVisible({ timeout: 8000 });
  });
});

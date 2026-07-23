import { expect, test } from '@playwright/test';
import { injectAuth, FAKE_ADMIN } from '../helpers/auth';
import { mockAdminStats, mockAdminPaymentStats, mockAdminUsers, mockStatsData } from '../helpers/mocks';
import { AdminStatsPage } from '../pages/AdminStatsPage';

test.describe('Admin — statistics', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, FAKE_ADMIN);
    await mockAdminUsers(page);
    await mockAdminStats(page);
    await mockAdminPaymentStats(page);
  });

  test('renders KPI card with total user count', async ({ page }) => {
    const statsPage = new AdminStatsPage(page);
    await statsPage.goto();

    await expect(page.getByText(String(mockStatsData.usersTotal))).toBeVisible({
      timeout: 10000,
    });
  });

  test('shows period toggle buttons', async ({ page }) => {
    const statsPage = new AdminStatsPage(page);
    await statsPage.goto();

    await expect(statsPage.thisWeekButton).toBeVisible({ timeout: 10000 });
    await expect(statsPage.thisMonthButton).toBeVisible();
    await expect(statsPage.thisYearButton).toBeVisible();
  });

  test('shows export actions inside the Export dropdown', async ({ page }) => {
    const statsPage = new AdminStatsPage(page);
    await statsPage.goto();

    await expect(statsPage.exportMenuButton).toBeVisible({ timeout: 10000 });

    // All exports (CSVs + Executive PDF) are grouped under the Export dropdown menu.
    await statsPage.openExportMenu();
    await expect(statsPage.exportUsersCsvButton).toBeVisible();
    await expect(statsPage.exportBillingCsvButton).toBeVisible();
    await expect(statsPage.exportPdfMenuItem).toBeVisible();
  });

  test('clicking This Week does not crash the page', async ({ page }) => {
    const statsPage = new AdminStatsPage(page);
    await statsPage.goto();

    await statsPage.thisWeekButton.waitFor({ state: 'visible', timeout: 10000 });
    await statsPage.thisWeekButton.click();

    // Period buttons still present after click — no crash
    await expect(statsPage.thisWeekButton).toBeVisible();
  });
});

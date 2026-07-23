import { type Locator, type Page } from '@playwright/test';

export class AdminStatsPage {
  // Period toggle is an Ant Segmented control — items are labels, not buttons.
  readonly thisWeekButton: Locator;
  readonly thisMonthButton: Locator;
  readonly thisYearButton: Locator;
  // All exports (users CSV, billing CSV, Executive PDF) live inside a single
  // "Export" dropdown menu — there are no standalone export buttons anymore.
  readonly exportMenuButton: Locator;
  readonly exportUsersCsvButton: Locator;
  readonly exportBillingCsvButton: Locator;
  readonly exportPdfMenuItem: Locator;

  constructor(private readonly page: Page) {
    this.thisWeekButton = page.locator('.ant-segmented-item').filter({ hasText: 'This Week' });
    this.thisMonthButton = page.locator('.ant-segmented-item').filter({ hasText: 'This Month' });
    this.thisYearButton = page.locator('.ant-segmented-item').filter({ hasText: 'This Year' });
    // The Export dropdown trigger is the only button with a download icon.
    this.exportMenuButton = page.locator('button:has(.anticon-download)');
    this.exportUsersCsvButton = page.getByRole('menuitem', { name: /Export users/i });
    this.exportBillingCsvButton = page.getByRole('menuitem', { name: /Export billing/i });
    this.exportPdfMenuItem = page.getByRole('menuitem', { name: /Executive PDF/i });
  }

  /** Open the Export dropdown so its menu items become visible. */
  async openExportMenu() {
    await this.exportMenuButton.click();
  }

  async goto() {
    await this.page.goto('/admin/statistics');
  }
}

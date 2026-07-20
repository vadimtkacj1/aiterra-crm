import { type Locator, type Page } from '@playwright/test';

export class AdminStatsPage {
  // Period toggle is an Ant Segmented control — items are labels, not buttons.
  readonly thisWeekButton: Locator;
  readonly thisMonthButton: Locator;
  readonly thisYearButton: Locator;
  readonly downloadPdfButton: Locator;
  // The two CSV exports now live inside an "Export" dropdown menu.
  readonly exportMenuButton: Locator;
  readonly exportUsersCsvButton: Locator;
  readonly exportBillingCsvButton: Locator;

  constructor(private readonly page: Page) {
    this.thisWeekButton = page.locator('.ant-segmented-item').filter({ hasText: 'This Week' });
    this.thisMonthButton = page.locator('.ant-segmented-item').filter({ hasText: 'This Month' });
    this.thisYearButton = page.locator('.ant-segmented-item').filter({ hasText: 'This Year' });
    this.downloadPdfButton = page.getByRole('button', { name: /Executive PDF/i });
    // The Export dropdown trigger is the only button with a download icon.
    this.exportMenuButton = page.locator('button:has(.anticon-download)');
    this.exportUsersCsvButton = page.getByRole('menuitem', { name: /Export users/i });
    this.exportBillingCsvButton = page.getByRole('menuitem', { name: /Export billing/i });
  }

  /** Open the Export dropdown so its CSV menu items become visible. */
  async openExportMenu() {
    await this.exportMenuButton.click();
  }

  async goto() {
    await this.page.goto('/admin/statistics');
  }
}

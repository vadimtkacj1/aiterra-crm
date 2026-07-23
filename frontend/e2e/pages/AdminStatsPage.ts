import { type Locator, type Page } from '@playwright/test';

export class AdminStatsPage {
  // Period toggle is the shadcn Segmented control — a role=radiogroup whose
  // items are buttons with role=radio.
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
    const periodGroup = page.getByRole('radiogroup');
    this.thisWeekButton = periodGroup.getByRole('radio', { name: 'This Week' });
    this.thisMonthButton = periodGroup.getByRole('radio', { name: 'This Month' });
    this.thisYearButton = periodGroup.getByRole('radio', { name: 'This Year' });
    // The Export dropdown trigger carries a stable aria-label (t("common.export")).
    this.exportMenuButton = page.getByRole('button', { name: 'Export', exact: true });
    // Menu items are Radix dropdown-menu items (role=menuitem).
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

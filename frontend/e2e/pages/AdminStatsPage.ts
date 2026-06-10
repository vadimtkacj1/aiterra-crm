import { type Locator, type Page } from '@playwright/test';

export class AdminStatsPage {
  readonly thisWeekButton: Locator;
  readonly thisMonthButton: Locator;
  readonly thisYearButton: Locator;
  readonly downloadPdfButton: Locator;
  readonly exportUsersCsvButton: Locator;
  readonly exportBillingCsvButton: Locator;

  constructor(private readonly page: Page) {
    this.thisWeekButton = page.getByRole('button', { name: 'This Week' });
    this.thisMonthButton = page.getByRole('button', { name: 'This Month' });
    this.thisYearButton = page.getByRole('button', { name: 'This Year' });
    this.downloadPdfButton = page.getByRole('button', { name: /Executive PDF/i });
    this.exportUsersCsvButton = page.getByRole('button', { name: /Export users/i });
    this.exportBillingCsvButton = page.getByRole('button', { name: /Export billing/i });
  }

  async goto() {
    await this.page.goto('/admin/statistics');
  }
}

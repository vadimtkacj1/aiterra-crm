import { type Locator, type Page } from '@playwright/test';

export class AdminLeadsPage {
  readonly leadsTable: Locator;
  readonly accountFilter: Locator;
  readonly reloadButton: Locator;

  constructor(private readonly page: Page) {
    this.leadsTable = page.getByRole('table');
    this.accountFilter = page.getByRole('combobox').first();
    this.reloadButton = page.getByRole('button', { name: /reload/i });
  }

  async goto() {
    await this.page.goto('/admin/leads');
  }
}

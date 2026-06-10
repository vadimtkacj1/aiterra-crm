import { type Locator, type Page } from '@playwright/test';

export class AdminMetaBudgetPage {
  readonly topupsTable: Locator;
  readonly reloadButton: Locator;

  constructor(private readonly page: Page) {
    this.topupsTable = page.getByRole('table');
    this.reloadButton = page.getByRole('button', { name: /reload/i });
  }

  async goto() {
    await this.page.goto('/admin/meta-budget');
  }
}

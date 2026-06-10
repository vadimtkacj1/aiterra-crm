import { type Locator, type Page } from '@playwright/test';

export class AdminInvoicesPage {
  readonly createButton: Locator;
  readonly invoicesTable: Locator;

  constructor(private readonly page: Page) {
    this.createButton = page.getByRole('button', { name: /Create/i });
    this.invoicesTable = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/admin/invoices');
  }
}

import { type Locator, type Page } from '@playwright/test';

export class AdminPaymentsPage {
  readonly recipientSelect: Locator;
  readonly historyTable: Locator;

  constructor(private readonly page: Page) {
    this.recipientSelect = page.getByRole('combobox').first();
    this.historyTable = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/admin/payments');
  }
}

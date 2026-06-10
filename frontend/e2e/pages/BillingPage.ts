import { type Locator, type Page } from '@playwright/test';

export class BillingPage {
  readonly payNowButton: Locator;
  readonly reloadButton: Locator;

  constructor(private readonly page: Page) {
    this.payNowButton = page.getByRole('button', { name: /Pay Now/i });
    this.reloadButton = page.getByRole('button', { name: /reload/i });
  }

  async goto(accountId = '10') {
    await this.page.goto(`/a/${accountId}/billing`);
  }
}

import { type Locator, type Page } from '@playwright/test';

export class BillingCheckoutPage {
  readonly payButton: Locator;
  readonly consentCheckbox: Locator;
  readonly backButton: Locator;

  constructor(private readonly page: Page) {
    this.payButton = page.getByRole('button', { name: /Pay/ });
    this.consentCheckbox = page.locator('input[type="checkbox"]').first();
    this.backButton = page.getByRole('button', { name: /Back/i });
  }

  async goto(accountId: string | number, payment: { id: string; amount: number; currency: string; summary: string }) {
    await this.page.goto(`/a/${accountId}/billing/checkout`, {
      state: { payment, intent: 'hosted' },
    } as Parameters<Page['goto']>[1] & { state: unknown });
  }
}

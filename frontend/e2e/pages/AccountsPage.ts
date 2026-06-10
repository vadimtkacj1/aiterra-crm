import { type Locator, type Page } from '@playwright/test';

export class AccountsPage {
  readonly searchInput: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByPlaceholder('Search by name or account number');
  }

  async goto() {
    await this.page.goto('/accounts');
  }

  openButton(index = 0): Locator {
    return this.page.getByRole('button', { name: 'Open' }).nth(index);
  }

  accountName(name: string): Locator {
    return this.page.getByText(name);
  }
}

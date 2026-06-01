import { type Locator, type Page } from '@playwright/test';

export class AdminContractsPage {
  readonly newContractButton: Locator;
  readonly contractsTable: Locator;

  constructor(private readonly page: Page) {
    this.newContractButton = page.getByRole('button', { name: 'New Contract' });
    this.contractsTable = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/admin/contracts');
  }

  /** First row action button matching the given text (Send, Void, etc.). */
  rowAction(label: string): Locator {
    return this.page.getByRole('button', { name: label }).first();
  }

  /** Confirmation modal OK button (Ant Design confirm dialog). */
  get confirmOkButton(): Locator {
    return this.page.getByRole('button', { name: 'OK' });
  }
}

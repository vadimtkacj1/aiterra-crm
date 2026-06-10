import { type Locator, type Page } from '@playwright/test';

export class AdminAuditPage {
  readonly auditTable: Locator;
  readonly reloadButton: Locator;

  constructor(private readonly page: Page) {
    this.auditTable = page.getByRole('table');
    this.reloadButton = page.getByRole('button', { name: /reload/i });
  }

  async goto() {
    await this.page.goto('/admin/audit');
  }
}

import { type Locator, type Page } from '@playwright/test';

export class SettingsPage {
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly saveButton: Locator;

  constructor(private readonly page: Page) {
    // Use Ant Design Form.Item label associations instead of autocomplete attributes
    this.currentPasswordInput = page.getByLabel('Current password', { exact: false });
    this.newPasswordInput = page.getByLabel('New password', { exact: false });
    this.confirmPasswordInput = page.getByLabel('Confirm new password', { exact: false });
    this.saveButton = page.getByRole('button', { name: /Update password/i });
  }

  async goto(accountId = '10') {
    await this.page.goto(`/a/${accountId}/settings`);
  }

  async fillPasswordForm(current: string, newPass: string, confirm: string) {
    await this.currentPasswordInput.fill(current);
    await this.newPasswordInput.fill(newPass);
    await this.confirmPasswordInput.fill(confirm);
    await this.saveButton.click();
  }
}

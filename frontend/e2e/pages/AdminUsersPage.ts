import { type Locator, type Page } from '@playwright/test';

export class AdminUsersPage {
  readonly createUserButton: Locator;
  readonly usersTable: Locator;

  constructor(private readonly page: Page) {
    this.createUserButton = page.getByRole('button', { name: /Create account/i });
    this.usersTable = page.getByRole('table');
  }

  async goto() {
    await this.page.goto('/admin/users');
  }

  editButton(index = 0): Locator {
    return this.page.getByRole('button', { name: 'edit' }).nth(index);
  }

  deleteButton(index = 0): Locator {
    return this.page.getByRole('button', { name: 'delete' }).nth(index);
  }

  resetPasswordButton(index = 0): Locator {
    return this.page.getByRole('button', { name: 'lock' }).nth(index);
  }
}

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

  /** Per-row ⋯ overflow trigger (reset password / delete live inside it). */
  overflowButton(index = 0): Locator {
    return this.page.getByRole('button', { name: 'more' }).nth(index);
  }

  overflowMenuItem(name: string | RegExp): Locator {
    return this.page.getByRole('menuitem', { name });
  }

  resetPasswordMenuItem(): Locator {
    return this.overflowMenuItem(/reset password/i);
  }

  deleteMenuItem(): Locator {
    return this.overflowMenuItem(/delete/i);
  }
}

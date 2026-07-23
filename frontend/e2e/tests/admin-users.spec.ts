import { expect, test } from '@playwright/test';
import { injectAuth, FAKE_ADMIN } from '../helpers/auth';
import {
  mockAdminUserEntry,
  mockAdminUserDelete,
  mockAdminUsersWithData,
} from '../helpers/mocks';
import { AdminUsersPage } from '../pages/AdminUsersPage';

test.describe('Admin — users', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, FAKE_ADMIN);
  });

  test('lists users in the table', async ({ page }) => {
    await mockAdminUsersWithData(page);

    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();

    await expect(usersPage.usersTable).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(mockAdminUserEntry.email)).toBeVisible();
    await expect(page.getByText(mockAdminUserEntry.displayName)).toBeVisible();
  });

  test('shows Create account button', async ({ page }) => {
    await mockAdminUsersWithData(page);

    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();

    await expect(usersPage.createUserButton).toBeVisible({ timeout: 8000 });
  });

  test('opens create user modal on button click', async ({ page }) => {
    await mockAdminUsersWithData(page);

    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();
    await expect(usersPage.createUserButton).toBeVisible({ timeout: 8000 });
    await usersPage.createUserButton.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });
  });

  test('opens reset password modal from row overflow menu', async ({ page }) => {
    await mockAdminUsersWithData(page);

    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();
    await expect(usersPage.usersTable).toBeVisible({ timeout: 8000 });
    await usersPage.overflowButton().click();
    await usersPage.resetPasswordMenuItem().click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('delete via row overflow menu triggers confirmation dialog', async ({ page }) => {
    await mockAdminUserDelete(page, mockAdminUserEntry.id);
    await mockAdminUsersWithData(page);

    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();
    await expect(usersPage.usersTable).toBeVisible({ timeout: 8000 });
    await usersPage.overflowButton().click();
    await usersPage.deleteMenuItem().click();

    await expect(
      page.getByRole('button', { name: 'OK' }).or(page.getByRole('button', { name: 'Yes' })).first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test('table shows no user rows when no users exist', async ({ page }) => {
    await page.route('/api/admin/users', (route) =>
      route.fulfill({ json: [] }),
    );

    const usersPage = new AdminUsersPage(page);
    await usersPage.goto();

    await expect(usersPage.usersTable).toBeVisible({ timeout: 8000 });
    // Verify the mocked user email is absent (no data rows rendered)
    await expect(page.getByText(mockAdminUserEntry.email)).not.toBeVisible();
  });
});

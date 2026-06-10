import { expect, test } from '@playwright/test';
import { forceEnglish } from '../helpers/auth';
import { mockAccountsList, mockAdminUsers, mockLoginFail, mockLoginSuccess } from '../helpers/mocks';
import { LoginPage } from '../pages/LoginPage';

test.describe('Auth — login', () => {
  test.beforeEach(async ({ page }) => {
    await forceEnglish(page);
  });

  test('successful login redirects to /accounts', async ({ page }) => {
    await mockLoginSuccess(page);
    await mockAccountsList(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@test.com', 'correct-password');

    await expect(page).toHaveURL('/accounts');
  });

  test('invalid credentials shows error message', async ({ page }) => {
    await mockLoginFail(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@test.com', 'wrong-password');

    // Ant Design may render errors as role="alert", role="status", or a message div
    await expect(
      page.getByRole('alert')
        .or(page.getByRole('status'))
        .or(page.locator('[class*="ant-message"]'))
        .first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test('submit with empty fields stays on login page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.submitButton).toBeVisible();
    await loginPage.submitButton.click();

    // Ant Design form validation shows inline errors — no navigation
    await expect(page).toHaveURL('/login');
  });

  test('admin login redirects to an authenticated page', async ({ page }) => {
    await mockAdminUsers(page);
    await page.route('/api/auth/login', (route) =>
      route.fulfill({
        json: {
          accessToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwiZXhwIjo5OTk5OTk5OTk5fQ.fakesig',
          user: { id: 1, email: 'admin@test.com', displayName: 'Admin', role: 'admin' },
        },
      }),
    );
    await mockAccountsList(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('admin@test.com', 'admin-password');

    // Admin may land on /accounts or the admin panel — both are valid post-login destinations
    await expect(page).not.toHaveURL('/login', { timeout: 8000 });
    await expect(page).toHaveURL(/\/(accounts|admin)/, { timeout: 8000 });
  });
});

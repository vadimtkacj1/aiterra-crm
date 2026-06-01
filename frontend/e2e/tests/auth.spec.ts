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

    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('submit with empty fields stays on login page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.submitButton).toBeVisible();
    await loginPage.submitButton.click();

    // Ant Design form validation shows inline errors — no navigation
    await expect(page).toHaveURL('/login');
  });

  test('admin login redirects to /accounts', async ({ page }) => {
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

    await expect(page).toHaveURL('/accounts');
  });
});

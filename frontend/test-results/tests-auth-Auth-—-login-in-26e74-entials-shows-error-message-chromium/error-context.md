# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\auth.spec.ts >> Auth — login >> invalid credentials shows error message
- Location: e2e\tests\auth.spec.ts:22:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('alert')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('alert')

```

```yaml
- text: English
- combobox "Language"
- img "global"
- img "Aiterra CRM"
- heading "Sign in" [level=3]
- text: Use the credentials from your organization. * Email
- img "user"
- textbox "* Email":
  - /placeholder: you@company.com
  - text: user@test.com
- text: "* Password"
- img "lock"
- textbox "* Password": wrong-password
- img "eye-invisible"
- button "loading Sign in":
  - img "loading"
  - text: Sign in
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { forceEnglish } from '../helpers/auth';
  3  | import { mockAccountsList, mockAdminUsers, mockLoginFail, mockLoginSuccess } from '../helpers/mocks';
  4  | import { LoginPage } from '../pages/LoginPage';
  5  | 
  6  | test.describe('Auth — login', () => {
  7  |   test.beforeEach(async ({ page }) => {
  8  |     await forceEnglish(page);
  9  |   });
  10 | 
  11 |   test('successful login redirects to /accounts', async ({ page }) => {
  12 |     await mockLoginSuccess(page);
  13 |     await mockAccountsList(page);
  14 | 
  15 |     const loginPage = new LoginPage(page);
  16 |     await loginPage.goto();
  17 |     await loginPage.login('user@test.com', 'correct-password');
  18 | 
  19 |     await expect(page).toHaveURL('/accounts');
  20 |   });
  21 | 
  22 |   test('invalid credentials shows error message', async ({ page }) => {
  23 |     await mockLoginFail(page);
  24 | 
  25 |     const loginPage = new LoginPage(page);
  26 |     await loginPage.goto();
  27 |     await loginPage.login('user@test.com', 'wrong-password');
  28 | 
> 29 |     await expect(page.getByRole('alert')).toBeVisible();
     |                                           ^ Error: expect(locator).toBeVisible() failed
  30 |   });
  31 | 
  32 |   test('submit with empty fields stays on login page', async ({ page }) => {
  33 |     const loginPage = new LoginPage(page);
  34 |     await loginPage.goto();
  35 | 
  36 |     await expect(loginPage.submitButton).toBeVisible();
  37 |     await loginPage.submitButton.click();
  38 | 
  39 |     // Ant Design form validation shows inline errors — no navigation
  40 |     await expect(page).toHaveURL('/login');
  41 |   });
  42 | 
  43 |   test('admin login redirects to /accounts', async ({ page }) => {
  44 |     await mockAdminUsers(page);
  45 |     await page.route('/api/auth/login', (route) =>
  46 |       route.fulfill({
  47 |         json: {
  48 |           accessToken:
  49 |             'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwiZXhwIjo5OTk5OTk5OTk5fQ.fakesig',
  50 |           user: { id: 1, email: 'admin@test.com', displayName: 'Admin', role: 'admin' },
  51 |         },
  52 |       }),
  53 |     );
  54 |     await mockAccountsList(page);
  55 | 
  56 |     const loginPage = new LoginPage(page);
  57 |     await loginPage.goto();
  58 |     await loginPage.login('admin@test.com', 'admin-password');
  59 | 
  60 |     await expect(page).toHaveURL('/accounts');
  61 |   });
  62 | });
  63 | 
```
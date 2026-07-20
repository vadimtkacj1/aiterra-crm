# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\admin-users.spec.ts >> Admin — users >> opens create user modal on button click
- Location: e2e\tests\admin-users.spec.ts:35:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Create account/i })
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for getByRole('button', { name: /Create account/i })
    - waiting for" http://localhost:5173/login" navigation to finish...
    - navigated to "http://localhost:5173/login"

```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { injectAuth, FAKE_ADMIN } from '../helpers/auth';
  3  | import {
  4  |   mockAdminUserEntry,
  5  |   mockAdminUserDelete,
  6  |   mockAdminUsersWithData,
  7  | } from '../helpers/mocks';
  8  | import { AdminUsersPage } from '../pages/AdminUsersPage';
  9  | 
  10 | test.describe('Admin — users', () => {
  11 |   test.beforeEach(async ({ page }) => {
  12 |     await injectAuth(page, FAKE_ADMIN);
  13 |   });
  14 | 
  15 |   test('lists users in the table', async ({ page }) => {
  16 |     await mockAdminUsersWithData(page);
  17 | 
  18 |     const usersPage = new AdminUsersPage(page);
  19 |     await usersPage.goto();
  20 | 
  21 |     await expect(usersPage.usersTable).toBeVisible({ timeout: 8000 });
  22 |     await expect(page.getByText(mockAdminUserEntry.email)).toBeVisible();
  23 |     await expect(page.getByText(mockAdminUserEntry.displayName)).toBeVisible();
  24 |   });
  25 | 
  26 |   test('shows Create account button', async ({ page }) => {
  27 |     await mockAdminUsersWithData(page);
  28 | 
  29 |     const usersPage = new AdminUsersPage(page);
  30 |     await usersPage.goto();
  31 | 
  32 |     await expect(usersPage.createUserButton).toBeVisible({ timeout: 8000 });
  33 |   });
  34 | 
  35 |   test('opens create user modal on button click', async ({ page }) => {
  36 |     await mockAdminUsersWithData(page);
  37 | 
  38 |     const usersPage = new AdminUsersPage(page);
  39 |     await usersPage.goto();
> 40 |     await expect(usersPage.createUserButton).toBeVisible({ timeout: 8000 });
     |                                              ^ Error: expect(locator).toBeVisible() failed
  41 |     await usersPage.createUserButton.click();
  42 | 
  43 |     await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });
  44 |   });
  45 | 
  46 |   test('opens reset password modal on lock button click', async ({ page }) => {
  47 |     await mockAdminUsersWithData(page);
  48 | 
  49 |     const usersPage = new AdminUsersPage(page);
  50 |     await usersPage.goto();
  51 |     await expect(usersPage.usersTable).toBeVisible({ timeout: 8000 });
  52 |     await usersPage.resetPasswordButton().click();
  53 | 
  54 |     await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  55 |     await expect(page.locator('input[type="password"]')).toBeVisible();
  56 |   });
  57 | 
  58 |   test('delete button triggers confirmation dialog', async ({ page }) => {
  59 |     await mockAdminUserDelete(page, mockAdminUserEntry.id);
  60 |     await mockAdminUsersWithData(page);
  61 | 
  62 |     const usersPage = new AdminUsersPage(page);
  63 |     await usersPage.goto();
  64 |     await expect(usersPage.usersTable).toBeVisible({ timeout: 8000 });
  65 |     await usersPage.deleteButton().click();
  66 | 
  67 |     await expect(
  68 |       page.getByRole('button', { name: 'OK' }).or(page.getByRole('button', { name: 'Yes' })).first(),
  69 |     ).toBeVisible({ timeout: 8000 });
  70 |   });
  71 | 
  72 |   test('table shows no user rows when no users exist', async ({ page }) => {
  73 |     await page.route('/api/admin/users', (route) =>
  74 |       route.fulfill({ json: [] }),
  75 |     );
  76 | 
  77 |     const usersPage = new AdminUsersPage(page);
  78 |     await usersPage.goto();
  79 | 
  80 |     await expect(usersPage.usersTable).toBeVisible({ timeout: 8000 });
  81 |     // Verify the mocked user email is absent (no data rows rendered)
  82 |     await expect(page.getByText(mockAdminUserEntry.email)).not.toBeVisible();
  83 |   });
  84 | });
  85 | 
```
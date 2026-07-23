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

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- complementary:
  - img "Aiterra CRM"
  - menu:
    - text: Overview
    - group:
      - menuitem "bar-chart System Statistics":
        - img "bar-chart"
        - text: System Statistics
      - menuitem "safety-certificate Audit & security":
        - img "safety-certificate"
        - text: Audit & security
    - text: Clients
    - group:
      - menuitem "team All users":
        - img "team"
        - text: All users
      - menuitem "form Landing page leads":
        - img "form"
        - text: Landing page leads
    - text: Billing
    - group:
      - menuitem "file-text Create Invoice":
        - img "file-text"
        - text: Create Invoice
      - menuitem "container Contracts":
        - img "container"
        - text: Contracts
      - menuitem "dollar Invoices & Subscriptions":
        - img "dollar"
        - text: Invoices & Subscriptions
      - menuitem "credit-card Meta Ad Budget":
        - img "credit-card"
        - text: Meta Ad Budget
    - text: Connections
    - group:
      - menuitem "whats-app WhatsApp connections":
        - img "whats-app"
        - text: WhatsApp connections
    - menuitem "question-circle Help & CRM guide":
      - img "question-circle"
      - text: Help & CRM guide
- banner:
  - button "Admin User":
    - text: A Admin User
    - img "down"
- main:
  - heading "System Statistics" [level=2]
  - text: Users, businesses, and revenue across the whole system.
  - button "download Export" [disabled]:
    - img "download"
    - text: Export
  - list:
    - listitem
    - listitem
    - listitem
    - listitem
- region "Notifications alt+T"
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
  46 |   test('opens reset password modal from row overflow menu', async ({ page }) => {
  47 |     await mockAdminUsersWithData(page);
  48 | 
  49 |     const usersPage = new AdminUsersPage(page);
  50 |     await usersPage.goto();
  51 |     await expect(usersPage.usersTable).toBeVisible({ timeout: 8000 });
  52 |     await usersPage.overflowButton().click();
  53 |     await usersPage.resetPasswordMenuItem().click();
  54 | 
  55 |     await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  56 |     await expect(page.locator('input[type="password"]')).toBeVisible();
  57 |   });
  58 | 
  59 |   test('delete via row overflow menu triggers confirmation dialog', async ({ page }) => {
  60 |     await mockAdminUserDelete(page, mockAdminUserEntry.id);
  61 |     await mockAdminUsersWithData(page);
  62 | 
  63 |     const usersPage = new AdminUsersPage(page);
  64 |     await usersPage.goto();
  65 |     await expect(usersPage.usersTable).toBeVisible({ timeout: 8000 });
  66 |     await usersPage.overflowButton().click();
  67 |     await usersPage.deleteMenuItem().click();
  68 | 
  69 |     await expect(
  70 |       page.getByRole('button', { name: 'OK' }).or(page.getByRole('button', { name: 'Yes' })).first(),
  71 |     ).toBeVisible({ timeout: 8000 });
  72 |   });
  73 | 
  74 |   test('table shows no user rows when no users exist', async ({ page }) => {
  75 |     await page.route('/api/admin/users', (route) =>
  76 |       route.fulfill({ json: [] }),
  77 |     );
  78 | 
  79 |     const usersPage = new AdminUsersPage(page);
  80 |     await usersPage.goto();
  81 | 
  82 |     await expect(usersPage.usersTable).toBeVisible({ timeout: 8000 });
  83 |     // Verify the mocked user email is absent (no data rows rendered)
  84 |     await expect(page.getByText(mockAdminUserEntry.email)).not.toBeVisible();
  85 |   });
  86 | });
  87 | 
```
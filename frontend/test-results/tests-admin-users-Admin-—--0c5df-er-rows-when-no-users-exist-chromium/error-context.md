# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\admin-users.spec.ts >> Admin — users >> table shows no user rows when no users exist
- Location: e2e\tests\admin-users.spec.ts:74:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('table')
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for getByRole('table')
    2 × waiting for" http://localhost:5173/login" navigation to finish...
      - navigated to "http://localhost:5173/login"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - link "Skip to main content" [ref=e5] [cursor=pointer]:
      - /url: "#main-content"
    - complementary [ref=e6]:
      - generic [ref=e8]:
        - img "Aiterra CRM" [ref=e10]
        - menu [ref=e12]:
          - text: Overview
          - group [ref=e13]:
            - menuitem "bar-chart System Statistics" [ref=e14] [cursor=pointer]:
              - img "bar-chart" [ref=e15]:
                - img [ref=e16]
              - generic [ref=e18]: System Statistics
            - menuitem "safety-certificate Audit & security" [ref=e19] [cursor=pointer]:
              - img "safety-certificate" [ref=e20]:
                - img [ref=e21]
              - generic [ref=e23]: Audit & security
          - text: Clients
          - group [ref=e24]:
            - menuitem "team All users" [ref=e25] [cursor=pointer]:
              - img "team" [ref=e26]:
                - img [ref=e27]
              - generic [ref=e29]: All users
            - menuitem "form Landing page leads" [ref=e30] [cursor=pointer]:
              - img "form" [ref=e31]:
                - img [ref=e32]
              - generic [ref=e35]: Landing page leads
          - text: Billing
          - group [ref=e36]:
            - menuitem "file-text Create Invoice" [ref=e37] [cursor=pointer]:
              - img "file-text" [ref=e38]:
                - img [ref=e39]
              - generic [ref=e41]: Create Invoice
            - menuitem "container Contracts" [ref=e42] [cursor=pointer]:
              - img "container" [ref=e43]:
                - img [ref=e44]
              - generic [ref=e46]: Contracts
            - menuitem "dollar Invoices & Subscriptions" [ref=e47] [cursor=pointer]:
              - img "dollar" [ref=e48]:
                - img [ref=e49]
              - generic [ref=e51]: Invoices & Subscriptions
            - menuitem "credit-card Meta Ad Budget" [ref=e52] [cursor=pointer]:
              - img "credit-card" [ref=e53]:
                - img [ref=e54]
              - generic [ref=e56]: Meta Ad Budget
          - text: Connections
          - group [ref=e57]:
            - menuitem "whats-app WhatsApp connections" [ref=e58] [cursor=pointer]:
              - img "whats-app" [ref=e59]:
                - img [ref=e60]
              - generic [ref=e63]: WhatsApp connections
          - menuitem "question-circle Help & CRM guide" [ref=e64] [cursor=pointer]:
            - img "question-circle" [ref=e65]:
              - img [ref=e66]
            - generic [ref=e69]: Help & CRM guide
    - generic [ref=e70]:
      - banner [ref=e71]:
        - button "Admin User" [ref=e73] [cursor=pointer]:
          - generic [ref=e75]: A
          - generic "Admin User" [ref=e76]
          - img "down" [ref=e77]:
            - img [ref=e78]
      - main [ref=e80]:
        - generic [ref=e81]:
          - generic [ref=e83]:
            - generic [ref=e84]:
              - heading "System Statistics" [level=2] [ref=e85]
              - text: Users, businesses, and revenue across the whole system.
            - button "download Export" [ref=e88] [cursor=pointer]:
              - img "download" [ref=e90]:
                - img [ref=e91]
              - generic [ref=e93]: Export
          - generic [ref=e95]:
            - generic [ref=e96]:
              - heading "Revenue" [level=5] [ref=e97]
              - radiogroup "segmented control" [ref=e98]:
                - generic [ref=e99]:
                  - generic [ref=e100] [cursor=pointer]:
                    - radio "This Week" [checked]
                    - generic "This Week" [ref=e101]
                  - generic [ref=e102] [cursor=pointer]:
                    - radio "This Month"
                    - generic "This Month" [ref=e103]
                  - generic [ref=e104] [cursor=pointer]:
                    - radio "This Year"
                    - generic "This Year" [ref=e105]
            - generic [ref=e107]: No data available
          - generic [ref=e109]:
            - heading "Revenue by Currency" [level=5] [ref=e111]
            - generic [ref=e113]: No data available
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
  40 |     await expect(usersPage.createUserButton).toBeVisible({ timeout: 8000 });
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
> 82 |     await expect(usersPage.usersTable).toBeVisible({ timeout: 8000 });
     |                                        ^ Error: expect(locator).toBeVisible() failed
  83 |     // Verify the mocked user email is absent (no data rows rendered)
  84 |     await expect(page.getByText(mockAdminUserEntry.email)).not.toBeVisible();
  85 |   });
  86 | });
  87 | 
```
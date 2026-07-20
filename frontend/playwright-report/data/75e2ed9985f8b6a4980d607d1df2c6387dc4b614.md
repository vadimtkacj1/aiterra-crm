# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\admin-users.spec.ts >> Admin — users >> shows Create account button
- Location: e2e\tests\admin-users.spec.ts:26:3

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

# Page snapshot

```yaml
- generic [ref=e4]:
  - link "Skip to main content" [ref=e5] [cursor=pointer]:
    - /url: "#main-content"
  - complementary [ref=e6]:
    - generic [ref=e8]:
      - img "Aiterra CRM" [ref=e10]
      - menu [ref=e12]:
        - menuitem "bar-chart System Statistics" [ref=e13] [cursor=pointer]:
          - img "bar-chart" [ref=e14]:
            - img [ref=e15]
          - generic [ref=e17]: System Statistics
        - menuitem "safety-certificate Audit & security" [ref=e18] [cursor=pointer]:
          - img "safety-certificate" [ref=e19]:
            - img [ref=e20]
          - generic [ref=e22]: Audit & security
        - menuitem "team All users" [ref=e23] [cursor=pointer]:
          - img "team" [ref=e24]:
            - img [ref=e25]
          - generic [ref=e27]: All users
        - menuitem "file-text Create Invoice" [ref=e28] [cursor=pointer]:
          - img "file-text" [ref=e29]:
            - img [ref=e30]
          - generic [ref=e32]: Create Invoice
        - menuitem "container Contracts" [ref=e33] [cursor=pointer]:
          - img "container" [ref=e34]:
            - img [ref=e35]
          - generic [ref=e37]: Contracts
        - menuitem "dollar Invoices & Subscriptions" [ref=e38] [cursor=pointer]:
          - img "dollar" [ref=e39]:
            - img [ref=e40]
          - generic [ref=e42]: Invoices & Subscriptions
        - menuitem "credit-card Meta Ad Budget" [ref=e43] [cursor=pointer]:
          - img "credit-card" [ref=e44]:
            - img [ref=e45]
          - generic [ref=e47]: Meta Ad Budget
        - menuitem "form Landing page leads" [ref=e48] [cursor=pointer]:
          - img "form" [ref=e49]:
            - img [ref=e50]
          - generic [ref=e53]: Landing page leads
        - menuitem "whats-app WhatsApp connections" [ref=e54] [cursor=pointer]:
          - img "whats-app" [ref=e55]:
            - img [ref=e56]
          - generic [ref=e59]: WhatsApp connections
        - menuitem "question-circle Help & CRM guide" [ref=e60] [cursor=pointer]:
          - img "question-circle" [ref=e61]:
            - img [ref=e62]
          - generic [ref=e65]: Help & CRM guide
        - menuitem "setting Settings" [ref=e66] [cursor=pointer]:
          - img "setting" [ref=e67]:
            - img [ref=e68]
          - generic [ref=e70]: Settings
      - generic [ref=e72] [cursor=pointer]:
        - generic "English" [ref=e73]:
          - text: English
          - combobox "Language" [ref=e74]
        - img "global" [ref=e76]:
          - img [ref=e77]
  - generic [ref=e79]:
    - banner [ref=e80]:
      - generic [ref=e81]:
        - generic "Admin User" [ref=e82]
        - button "Settings" [ref=e83] [cursor=pointer]:
          - img "setting" [ref=e85]:
            - img [ref=e86]
        - button "Sign out" [ref=e88] [cursor=pointer]:
          - img "logout" [ref=e90]:
            - img [ref=e91]
    - main [ref=e93]:
      - generic [ref=e94]:
        - generic [ref=e95]:
          - heading "System Statistics" [level=4] [ref=e96]
          - generic [ref=e97]:
            - button "file-pdf Executive PDF" [disabled] [ref=e99]:
              - generic:
                - img "file-pdf":
                  - img
              - generic: Executive PDF
            - button "download Export" [disabled] [ref=e101]:
              - generic:
                - img "download":
                  - img
              - generic: Export
            - button "safety-certificate Admin audit log" [disabled] [ref=e103]:
              - generic:
                - img "safety-certificate":
                  - img
              - generic: Admin audit log
            - button "loading Refresh" [ref=e105]:
              - img "loading" [ref=e107]:
                - img [ref=e108]
              - generic [ref=e110]: Refresh
        - list [ref=e157]:
          - listitem [ref=e158]
          - listitem [ref=e159]
          - listitem [ref=e160]
          - listitem [ref=e161]
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
> 32 |     await expect(usersPage.createUserButton).toBeVisible({ timeout: 8000 });
     |                                              ^ Error: expect(locator).toBeVisible() failed
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
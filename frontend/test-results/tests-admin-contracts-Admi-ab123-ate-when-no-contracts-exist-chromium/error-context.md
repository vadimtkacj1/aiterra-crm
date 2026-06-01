# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\admin-contracts.spec.ts >> Admin — contracts >> shows empty state when no contracts exist
- Location: e2e\tests\admin-contracts.spec.ts:75:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('No data').or(getByText('No Data'))
Expected: visible
Error: strict mode violation: getByText('No data').or(getByText('No Data')) resolved to 2 elements:
    1) <title>No data</title> aka getByRole('img', { name: 'No data' }).locator('title')
    2) <div class="ant-empty-description">No data</div> aka getByText('No data').nth(1)

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for getByText('No data').or(getByText('No Data'))

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - complementary [ref=e5]:
    - generic [ref=e7]:
      - img "Aiterra CRM" [ref=e9]
      - menu [ref=e11]:
        - menuitem "bar-chart System Statistics" [ref=e12] [cursor=pointer]:
          - img "bar-chart" [ref=e13]:
            - img [ref=e14]
          - generic [ref=e16]: System Statistics
        - menuitem "safety-certificate Audit & security" [ref=e17] [cursor=pointer]:
          - img "safety-certificate" [ref=e18]:
            - img [ref=e19]
          - generic [ref=e21]: Audit & security
        - menuitem "team All users" [ref=e22] [cursor=pointer]:
          - img "team" [ref=e23]:
            - img [ref=e24]
          - generic [ref=e26]: All users
        - menuitem "file-text Create Invoice" [ref=e27] [cursor=pointer]:
          - img "file-text" [ref=e28]:
            - img [ref=e29]
          - generic [ref=e31]: Create Invoice
        - menuitem "container Contracts" [ref=e32] [cursor=pointer]:
          - img "container" [ref=e33]:
            - img [ref=e34]
          - generic [ref=e36]: Contracts
        - menuitem "dollar Invoices & Subscriptions" [ref=e37] [cursor=pointer]:
          - img "dollar" [ref=e38]:
            - img [ref=e39]
          - generic [ref=e41]: Invoices & Subscriptions
        - menuitem "credit-card Meta Ad Budget" [ref=e42] [cursor=pointer]:
          - img "credit-card" [ref=e43]:
            - img [ref=e44]
          - generic [ref=e46]: Meta Ad Budget
        - menuitem "form Landing page leads" [ref=e47] [cursor=pointer]:
          - img "form" [ref=e48]:
            - img [ref=e49]
          - generic [ref=e52]: Landing page leads
        - menuitem "question-circle Help & CRM guide" [ref=e53] [cursor=pointer]:
          - img "question-circle" [ref=e54]:
            - img [ref=e55]
          - generic [ref=e58]: Help & CRM guide
        - menuitem "setting Settings" [ref=e59] [cursor=pointer]:
          - img "setting" [ref=e60]:
            - img [ref=e61]
          - generic [ref=e63]: Settings
      - generic [ref=e65] [cursor=pointer]:
        - generic "English" [ref=e66]:
          - text: English
          - combobox "Language" [ref=e67]
        - img "global" [ref=e69]:
          - img [ref=e70]
  - generic [ref=e72]:
    - banner [ref=e73]:
      - generic [ref=e74]:
        - generic "Admin User" [ref=e75]
        - button "Settings" [ref=e76] [cursor=pointer]:
          - img "setting" [ref=e78]:
            - img [ref=e79]
        - button "logout Sign out" [ref=e81] [cursor=pointer]:
          - img "logout" [ref=e83]:
            - img [ref=e84]
          - generic [ref=e86]: Sign out
    - main [ref=e87]:
      - generic [ref=e89]:
        - generic [ref=e91]:
          - generic [ref=e93]:
            - img "container" [ref=e94]:
              - img [ref=e95]
            - text: Contracts
          - button "plus New Contract" [ref=e98] [cursor=pointer]:
            - img "plus" [ref=e100]:
              - img [ref=e101]
            - generic [ref=e104]: New Contract
        - table [ref=e112]:
          - rowgroup [ref=e121]:
            - row "# Account Title Total Status" [ref=e122]:
              - columnheader [ref=e123]
              - columnheader "#" [ref=e124]
              - columnheader "Account" [ref=e125]
              - columnheader "Title" [ref=e126]
              - columnheader "Total" [ref=e127]
              - columnheader "Status" [ref=e128]
              - columnheader [ref=e129]
          - rowgroup [ref=e130]:
            - row "No data No data" [ref=e131]:
              - cell "No data No data" [ref=e132]:
                - generic [ref=e133]:
                  - img "No data" [ref=e135]
                  - generic [ref=e141]: No data
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { injectAuth, FAKE_ADMIN } from '../helpers/auth';
  3  | import {
  4  |   mockAdminContract,
  5  |   mockAdminContractsList,
  6  |   mockAdminContractSend,
  7  |   mockAdminContractVoid,
  8  |   mockAdminUsers,
  9  | } from '../helpers/mocks';
  10 | 
  11 | test.describe('Admin — contracts', () => {
  12 |   test.beforeEach(async ({ page }) => {
  13 |     await injectAuth(page, FAKE_ADMIN);
  14 |     await mockAdminUsers(page);
  15 |   });
  16 | 
  17 |   test('lists contracts in the table', async ({ page }) => {
  18 |     await mockAdminContractsList(page);
  19 | 
  20 |     await page.goto('/admin/contracts');
  21 | 
  22 |     await expect(page.getByRole('table')).toBeVisible({ timeout: 8000 });
  23 |     await expect(page.getByText('Service Agreement')).toBeVisible();
  24 |   });
  25 | 
  26 |   test('shows Draft status badge for draft contract', async ({ page }) => {
  27 |     await mockAdminContractsList(page);
  28 | 
  29 |     await page.goto('/admin/contracts');
  30 | 
  31 |     await expect(page.getByText('Draft')).toBeVisible({ timeout: 8000 });
  32 |   });
  33 | 
  34 |   test('opens new contract modal on button click', async ({ page }) => {
  35 |     await mockAdminContractsList(page);
  36 | 
  37 |     await page.goto('/admin/contracts');
  38 | 
  39 |     await page.getByRole('button', { name: 'New Contract' }).click();
  40 | 
  41 |     await expect(
  42 |       page.getByPlaceholder('e.g. Annual Service Agreement').or(
  43 |         page.getByText('Contract title'),
  44 |       ),
  45 |     ).toBeVisible({ timeout: 5000 });
  46 |   });
  47 | 
  48 |   test('send contract updates status to Awaiting signature', async ({ page }) => {
  49 |     await mockAdminContractsList(page);
  50 |     await mockAdminContractSend(page, mockAdminContract.id);
  51 | 
  52 |     await page.goto('/admin/contracts');
  53 | 
  54 |     // The send button is an icon-only button (SendOutlined) — match by icon aria-label
  55 |     await page.getByRole('button', { name: 'send' }).first().click();
  56 | 
  57 |     await expect(page.getByText('Awaiting signature')).toBeVisible({ timeout: 8000 });
  58 |   });
  59 | 
  60 |   test('void contract triggers confirmation then updates status', async ({ page }) => {
  61 |     await mockAdminContractsList(page);
  62 |     await mockAdminContractVoid(page, mockAdminContract.id);
  63 | 
  64 |     await page.goto('/admin/contracts');
  65 | 
  66 |     // The void button is MinusCircleOutlined — match by icon aria-label
  67 |     await page.getByRole('button', { name: 'minus-circle' }).first().click();
  68 | 
  69 |     // Ant Design Modal.confirm — click OK
  70 |     await page.getByRole('button', { name: 'OK' }).click();
  71 | 
  72 |     await expect(page.getByText('Voided')).toBeVisible({ timeout: 8000 });
  73 |   });
  74 | 
  75 |   test('shows empty state when no contracts exist', async ({ page }) => {
  76 |     await mockAdminContractsList(page, []);
  77 | 
  78 |     await page.goto('/admin/contracts');
  79 | 
  80 |     await expect(
  81 |       page.getByText('No data').or(page.getByText('No Data')),
> 82 |     ).toBeVisible({ timeout: 8000 });
     |       ^ Error: expect(locator).toBeVisible() failed
  83 |   });
  84 | });
  85 | 
```
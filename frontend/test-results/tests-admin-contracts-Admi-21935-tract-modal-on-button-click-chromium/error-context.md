# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\admin-contracts.spec.ts >> Admin — contracts >> opens new contract modal on button click
- Location: e2e\tests\admin-contracts.spec.ts:34:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByPlaceholder('e.g. Annual Service Agreement').or(getByText('Contract title'))
Expected: visible
Error: strict mode violation: getByPlaceholder('e.g. Annual Service Agreement').or(getByText('Contract title')) resolved to 2 elements:
    1) <label for="title" title="Contract title" class="ant-form-item-required">Contract title</label> aka getByText('Contract title')
    2) <input value="" id="title" type="text" aria-required="true" placeholder="e.g. Annual Service Agreement" class="ant-input ant-input-lg css-dev-only-do-not-override-ch9ese ant-input-outlined css-var-_r_0_ ant-input-css-var"/> aka getByRole('textbox', { name: '* Contract title' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByPlaceholder('e.g. Annual Service Agreement').or(getByText('Contract title'))

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
          - generic [ref=e108]:
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
                - 'row "#1 Account #10 Service Agreement ₪5,000.00 Not paid Draft eye copy send minus-circle delete" [ref=e131]':
                  - cell [ref=e132]
                  - cell "#1" [ref=e133]:
                    - generic [ref=e134]: "#1"
                  - 'cell "Account #10" [ref=e135]':
                    - generic [ref=e137]: "Account #10"
                  - cell "Service Agreement" [ref=e138]:
                    - strong [ref=e141]: Service Agreement
                  - cell "₪5,000.00 Not paid" [ref=e142]:
                    - generic [ref=e143]:
                      - generic [ref=e144]: ₪5,000.00
                      - generic [ref=e145]: Not paid
                  - cell "Draft" [ref=e146]:
                    - generic [ref=e148]: Draft
                  - cell "eye copy send minus-circle delete" [ref=e149]:
                    - generic [ref=e150]:
                      - button "eye" [ref=e152] [cursor=pointer]:
                        - img "eye" [ref=e154]:
                          - img [ref=e155]
                      - button "copy" [ref=e158] [cursor=pointer]:
                        - img "copy" [ref=e160]:
                          - img [ref=e161]
                      - button "send" [ref=e164] [cursor=pointer]:
                        - img "send" [ref=e166]:
                          - img [ref=e167]
                      - button "minus-circle" [ref=e170] [cursor=pointer]:
                        - img "minus-circle" [ref=e172]:
                          - img [ref=e173]
                      - button "delete" [ref=e177] [cursor=pointer]:
                        - img "delete" [ref=e179]:
                          - img [ref=e180]
            - list [ref=e182]:
              - listitem [ref=e183]: 1 contracts
              - listitem "Previous Page" [ref=e184]:
                - button "left" [disabled] [ref=e185]:
                  - img "left" [ref=e186]:
                    - img [ref=e187]
              - listitem "1" [ref=e189] [cursor=pointer]:
                - generic [ref=e190]: "1"
              - listitem "Next Page" [ref=e191]:
                - button "right" [disabled] [ref=e192]:
                  - img "right" [ref=e193]:
                    - img [ref=e194]
              - listitem [ref=e196]:
                - generic [ref=e197]:
                  - generic "20 / page" [ref=e198]:
                    - text: 20 / page
                    - combobox "Page Size" [ref=e199]
                  - img "down" [ref=e201]:
                    - img [ref=e202]
  - generic [ref=e204]:
    - dialog "New Contract":
      - generic [ref=e205]:
        - button "Close" [active] [ref=e206] [cursor=pointer]:
          - generic "Close" [ref=e207]:
            - img "close" [ref=e208]:
              - img [ref=e209]
        - generic [ref=e212]: New Contract
        - generic [ref=e214]:
          - generic [ref=e215]:
            - generic [ref=e216]:
              - generic [ref=e217]: "1"
              - strong [ref=e219]: Select Client
            - generic [ref=e225]:
              - generic [ref=e226]:
                - generic: Search client...
                - combobox [ref=e227]
              - img "down" [ref=e229]:
                - img [ref=e230]
          - generic [ref=e232]:
            - generic [ref=e233]:
              - generic [ref=e234]: "2"
              - strong [ref=e236]: Contract Details
            - generic [ref=e237]:
              - generic [ref=e240]:
                - generic "Contract title" [ref=e242]: "* Contract title"
                - textbox "* Contract title" [ref=e246]:
                  - /placeholder: e.g. Annual Service Agreement
              - generic [ref=e249]:
                - generic "Currency" [ref=e251]
                - generic [ref=e255] [cursor=pointer]:
                  - generic "ILS" [ref=e256]:
                    - text: ILS
                    - combobox "Currency" [ref=e257]
                  - img "down" [ref=e259]:
                    - img [ref=e260]
            - generic [ref=e263]:
              - generic "Contract terms" [ref=e265]
              - generic [ref=e266]:
                - textbox "Contract terms" [ref=e269]:
                  - /placeholder: Enter the contract terms...
                - generic [ref=e271]: Line breaks are preserved. The client sees the same paragraphs on the signing page.
            - generic [ref=e273]:
              - generic "PDF attachment" [ref=e275]
              - button "file-pdf Upload PDF" [ref=e282] [cursor=pointer]:
                - img "file-pdf" [ref=e284]:
                  - img [ref=e285]
                - generic [ref=e287]: Upload PDF
          - generic [ref=e288]:
            - generic [ref=e289]:
              - generic [ref=e290]: "3"
              - strong [ref=e292]: Payment
            - generic [ref=e293]:
              - button "check-circle wallet One-time / Installments Single payment or split into milestones" [pressed] [ref=e295] [cursor=pointer]:
                - img "check-circle" [ref=e296]:
                  - img [ref=e297]
                - img "wallet" [ref=e300]:
                  - img [ref=e301]
                - strong [ref=e304]: One-time / Installments
                - generic [ref=e305]: Single payment or split into milestones
              - button "sync Monthly Subscription Recurring monthly charge, automatically renewed" [ref=e307] [cursor=pointer]:
                - img "sync" [ref=e308]:
                  - img [ref=e309]
                - strong [ref=e312]: Monthly Subscription
                - generic [ref=e313]: Recurring monthly charge, automatically renewed
            - generic [ref=e314]:
              - generic [ref=e315]:
                - generic [ref=e316]: Split into equal payments
                - generic [ref=e317]:
                  - generic [ref=e318]:
                    - spinbutton "Total amount" [ref=e319]
                    - generic:
                      - button "Increase Value" [ref=e320] [cursor=pointer]:
                        - img "up" [ref=e321]:
                          - img [ref=e322]
                      - button "Decrease Value" [ref=e324] [cursor=pointer]:
                        - img "down" [ref=e325]:
                          - img [ref=e326]
                  - generic [ref=e328]: ÷
                  - generic [ref=e329]:
                    - spinbutton [ref=e330]: "2"
                    - generic:
                      - button "Increase Value" [ref=e331] [cursor=pointer]:
                        - img "up" [ref=e332]:
                          - img [ref=e333]
                      - button "Decrease Value" [disabled] [ref=e335] [cursor=pointer]:
                        - img "down" [ref=e336]:
                          - img [ref=e337]
                  - generic [ref=e339]: payments
                - button "Fill stages" [ref=e340] [cursor=pointer]:
                  - generic [ref=e341]: Fill stages
              - generic [ref=e342]:
                - generic [ref=e344]:
                  - generic [ref=e345]: "1"
                  - textbox "Description (e.g. First payment)" [ref=e351]
                  - generic [ref=e357]:
                    - spinbutton "0.00" [ref=e358]
                    - generic:
                      - button "Increase Value" [ref=e359] [cursor=pointer]:
                        - img "up" [ref=e360]:
                          - img [ref=e361]
                      - button "Decrease Value" [ref=e363] [cursor=pointer]:
                        - img "down" [ref=e364]:
                          - img [ref=e365]
                  - button "minus-circle" [disabled] [ref=e367]:
                    - generic:
                      - img "minus-circle":
                        - img
                - button "plus Add stage" [ref=e369] [cursor=pointer]:
                  - img "plus" [ref=e371]:
                    - img [ref=e372]
                  - generic [ref=e375]: Add stage
        - generic [ref=e377]:
          - button "Cancel" [ref=e378] [cursor=pointer]:
            - generic [ref=e379]: Cancel
          - button "Create" [ref=e380] [cursor=pointer]:
            - generic [ref=e381]: Create
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
> 45 |     ).toBeVisible({ timeout: 5000 });
     |       ^ Error: expect(locator).toBeVisible() failed
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
  82 |     ).toBeVisible({ timeout: 8000 });
  83 |   });
  84 | });
  85 | 
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\billing-checkout.spec.ts >> Billing checkout page >> calls checkout API when Pay is clicked
- Location: e2e\tests\billing-checkout.spec.ts:20:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Pay/ })
    - locator resolved to <button disabled type="button" class="ant-btn css-dev-only-do-not-override-ch9ese css-var-_r_0_ ant-btn-primary ant-btn-color-primary ant-btn-variant-solid ant-btn-lg">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    53 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

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
        - menuitem "wallet Payments & subscriptions" [ref=e13] [cursor=pointer]:
          - img "wallet" [ref=e14]:
            - img [ref=e15]
          - generic [ref=e17]: Payments & subscriptions
        - menuitem "file-text Contracts" [ref=e18] [cursor=pointer]:
          - img "file-text" [ref=e19]:
            - img [ref=e20]
          - generic [ref=e22]: Contracts
        - menuitem "question-circle Help & CRM guide" [ref=e23] [cursor=pointer]:
          - img "question-circle" [ref=e24]:
            - img [ref=e25]
          - generic [ref=e28]: Help & CRM guide
        - menuitem "setting Settings" [ref=e29] [cursor=pointer]:
          - img "setting" [ref=e30]:
            - img [ref=e31]
          - generic [ref=e33]: Settings
      - generic [ref=e35] [cursor=pointer]:
        - generic "English" [ref=e36]:
          - text: English
          - combobox "Language" [ref=e37]
        - img "global" [ref=e39]:
          - img [ref=e40]
  - generic [ref=e42]:
    - banner [ref=e43]:
      - strong [ref=e47]: Business
      - generic [ref=e48]:
        - generic "Test User" [ref=e49]
        - generic [ref=e51]:
          - button "Notifications" [ref=e52] [cursor=pointer]:
            - img "bell" [ref=e54]:
              - img [ref=e55]
          - superscript [ref=e57]:
            - generic [ref=e59]: "1"
        - button "Settings" [ref=e60] [cursor=pointer]:
          - img "setting" [ref=e62]:
            - img [ref=e63]
        - button "logout Sign out" [ref=e65] [cursor=pointer]:
          - img "logout" [ref=e67]:
            - img [ref=e68]
          - generic [ref=e70]: Sign out
    - main [ref=e71]:
      - generic [ref=e72]:
        - generic [ref=e73]:
          - button "arrow-left Back" [ref=e74] [cursor=pointer]:
            - img "arrow-left" [ref=e76]:
              - img [ref=e77]
            - generic [ref=e79]: Back
          - generic [ref=e80]:
            - img "lock" [ref=e81]:
              - img [ref=e82]
            - text: Secure checkout
        - generic [ref=e86]:
          - generic [ref=e87]:
            - generic [ref=e88]: Invoice
            - heading "Monthly subscription" [level=3] [ref=e89]
            - text: One-time
          - generic [ref=e90]:
            - generic [ref=e91]:
              - generic [ref=e92]: Total due
              - heading "₪1,000.00" [level=2] [ref=e93]
            - separator [ref=e94]
            - generic [ref=e95]:
              - img "wallet" [ref=e96]:
                - img [ref=e97]
              - generic [ref=e99]:
                - strong [ref=e101]: Pay Now
                - text: Opens a secure payment page
            - generic [ref=e102]: Agreement was accepted on the previous step. Complete your payment below.
            - generic [ref=e103]:
              - generic [ref=e104] [cursor=pointer]:
                - checkbox "I confirm the amount above and agree to be redirected to a secure payment page to complete this transaction." [ref=e106]
                - generic [ref=e107]: I confirm the amount above and agree to be redirected to a secure payment page to complete this transaction.
              - generic [ref=e108]:
                - text: By continuing you agree to the Terms of Service, Privacy Policy, and Cancellation Policy.
                - link "Terms of Service" [ref=e109] [cursor=pointer]:
                  - /url: /terms
                - text: and
                - link "Privacy Policy" [ref=e110] [cursor=pointer]:
                  - /url: /privacy-policy
                - text: and
                - link "Cancellation Policy" [ref=e111] [cursor=pointer]:
                  - /url: /cancel-policy
                - text: .
            - button "wallet Pay Now" [disabled] [ref=e112]:
              - generic:
                - img "wallet":
                  - img
              - generic: Pay Now
            - generic [ref=e113]:
              - img "check-circle" [ref=e114]:
                - img [ref=e115]
              - generic [ref=e117]: You’ll be redirected to a secure payment page.
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { injectAuth, FAKE_USER } from '../helpers/auth';
  3  | import { mockBillingOverview, mockHostedCheckout } from '../helpers/mocks';
  4  | 
  5  | const ACCOUNT_ID = '10';
  6  | 
  7  | test.describe('Billing checkout page', () => {
  8  |   test.beforeEach(async ({ page }) => {
  9  |     await injectAuth(page, FAKE_USER);
  10 |   });
  11 | 
  12 |   test('shows pay button when pending payment exists', async ({ page }) => {
  13 |     await mockBillingOverview(page, ACCOUNT_ID);
  14 | 
  15 |     await page.goto(`/a/${ACCOUNT_ID}/billing/checkout`);
  16 | 
  17 |     await expect(page.getByRole('button', { name: /Pay/ })).toBeVisible({ timeout: 8000 });
  18 |   });
  19 | 
  20 |   test('calls checkout API when Pay is clicked', async ({ page }) => {
  21 |     await mockBillingOverview(page, ACCOUNT_ID);
  22 | 
  23 |     let checkoutCalled = false;
  24 |     await page.route('/api/checkout', async (route) => {
  25 |       checkoutCalled = true;
  26 |       await route.fulfill({
  27 |         json: {
  28 |           status: 'ok',
  29 |           gateway: 'zcredit',
  30 |           sessionId: 'session-456',
  31 |           paymentUrl: 'https://pay.example.com/session-456',
  32 |         },
  33 |       });
  34 |     });
  35 | 
  36 |     await page.goto(`/a/${ACCOUNT_ID}/billing/checkout`);
  37 |     await expect(page.getByRole('button', { name: /Pay/ })).toBeVisible({ timeout: 8000 });
  38 | 
> 39 |     await page.getByRole('button', { name: /Pay/ }).click();
     |                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  40 | 
  41 |     // Give the app time to make the API call
  42 |     await page.waitForTimeout(1000);
  43 |     expect(checkoutCalled).toBe(true);
  44 |   });
  45 | 
  46 |   test('redirects back to billing when no pending payments', async ({ page }) => {
  47 |     await page.route(`/api/accounts/${ACCOUNT_ID}/billing/overview`, (route) =>
  48 |       route.fulfill({
  49 |         json: { pendingPayments: [], subscriptions: [], paymentHistory: [], savedCard: null },
  50 |       }),
  51 |     );
  52 | 
  53 |     await page.goto(`/a/${ACCOUNT_ID}/billing/checkout`);
  54 | 
  55 |     // No pending payment → app calls goBack() → billing page
  56 |     await expect(page).toHaveURL(new RegExp(`/a/${ACCOUNT_ID}/billing`), { timeout: 8000 });
  57 |   });
  58 | 
  59 |   test('shows error feedback when hosted checkout API fails', async ({ page }) => {
  60 |     await mockBillingOverview(page, ACCOUNT_ID);
  61 |     await page.route('/api/checkout', (route) =>
  62 |       route.fulfill({ status: 503, json: { detail: 'zcredit_not_configured' } }),
  63 |     );
  64 | 
  65 |     await page.goto(`/a/${ACCOUNT_ID}/billing/checkout`);
  66 |     await expect(page.getByRole('button', { name: /Pay/ })).toBeVisible({ timeout: 8000 });
  67 |     await page.getByRole('button', { name: /Pay/ }).click();
  68 | 
  69 |     // Ant Design message errors use role="status" or render in ant-message portal
  70 |     await expect(
  71 |       page.getByRole('alert')
  72 |         .or(page.getByRole('status'))
  73 |         .or(page.locator('[class*="ant-message"]'))
  74 |         .first(),
  75 |     ).toBeVisible({ timeout: 8000 });
  76 |   });
  77 | });
  78 | 
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\billing-checkout.spec.ts >> Billing checkout page >> redirects to payment URL when Pay is clicked
- Location: e2e\tests\billing-checkout.spec.ts:20:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Pay/ })
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for getByRole('button', { name: /Pay/ })

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
  20 |   test('redirects to payment URL when Pay is clicked', async ({ page }) => {
  21 |     await mockBillingOverview(page, ACCOUNT_ID);
  22 |     await mockHostedCheckout(page);
  23 | 
  24 |     await page.goto(`/a/${ACCOUNT_ID}/billing/checkout`);
> 25 |     await expect(page.getByRole('button', { name: /Pay/ })).toBeVisible({ timeout: 8000 });
     |                                                             ^ Error: expect(locator).toBeVisible() failed
  26 | 
  27 |     let finalUrl = '';
  28 |     page.on('framenavigated', (frame) => {
  29 |       if (frame === page.mainFrame()) finalUrl = frame.url();
  30 |     });
  31 | 
  32 |     await page.getByRole('button', { name: /Pay/ }).click();
  33 |     await page.waitForFunction(
  34 |       () => window.location.href.includes('pay.example.com'),
  35 |       { timeout: 8000 },
  36 |     ).catch(() => {});
  37 | 
  38 |     expect(finalUrl || page.url()).toContain('pay.example.com');
  39 |   });
  40 | 
  41 |   test('redirects back to billing when no pending payments', async ({ page }) => {
  42 |     await page.route(`/api/accounts/${ACCOUNT_ID}/billing/overview`, (route) =>
  43 |       route.fulfill({
  44 |         json: { pendingPayments: [], subscriptions: [], paymentHistory: [], savedCard: null },
  45 |       }),
  46 |     );
  47 | 
  48 |     await page.goto(`/a/${ACCOUNT_ID}/billing/checkout`);
  49 | 
  50 |     // No pending payment → app calls goBack() → billing page
  51 |     await expect(page).toHaveURL(new RegExp(`/a/${ACCOUNT_ID}/billing`), { timeout: 8000 });
  52 |   });
  53 | 
  54 |   test('shows error message when hosted checkout API fails', async ({ page }) => {
  55 |     await mockBillingOverview(page, ACCOUNT_ID);
  56 |     await page.route('/api/checkout', (route) =>
  57 |       route.fulfill({ status: 503, json: { detail: 'zcredit_not_configured' } }),
  58 |     );
  59 | 
  60 |     await page.goto(`/a/${ACCOUNT_ID}/billing/checkout`);
  61 |     await expect(page.getByRole('button', { name: /Pay/ })).toBeVisible({ timeout: 8000 });
  62 |     await page.getByRole('button', { name: /Pay/ }).click();
  63 | 
  64 |     await expect(page.getByRole('alert')).toBeVisible({ timeout: 8000 });
  65 |   });
  66 | });
  67 | 
```
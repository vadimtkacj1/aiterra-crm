# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\contract-sign.spec.ts >> Contract sign page >> pay now button redirects to payment URL
- Location: e2e\tests\contract-sign.spec.ts:70:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "pay.example.com"
Received string:    "chrome-error://chromewebdata/"
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import { forceEnglish } from '../helpers/auth';
  3   | import {
  4   |   CONTRACT_TOKEN,
  5   |   mockContract,
  6   |   mockContractCheckout,
  7   |   mockContractGet,
  8   |   mockContractSign,
  9   |   mockSignedContract,
  10  | } from '../helpers/mocks';
  11  | import { ContractSignPage } from '../pages/ContractSignPage';
  12  | 
  13  | test.describe('Contract sign page', () => {
  14  |   test.beforeEach(async ({ page }) => {
  15  |     await forceEnglish(page);
  16  |   });
  17  | 
  18  |   test('renders contract title after loading', async ({ page }) => {
  19  |     await mockContractGet(page);
  20  | 
  21  |     const signPage = new ContractSignPage(page);
  22  |     await signPage.goto(CONTRACT_TOKEN);
  23  | 
  24  |     await expect(page.getByRole('heading', { name: mockContract.title })).toBeVisible({ timeout: 8000 });
  25  |   });
  26  | 
  27  |   test('shows both payment stages', async ({ page }) => {
  28  |     await mockContractGet(page);
  29  | 
  30  |     const signPage = new ContractSignPage(page);
  31  |     await signPage.goto(CONTRACT_TOKEN);
  32  | 
  33  |     // Wait for contract to load, then check stage descriptions from mock data
  34  |     await expect(page.getByText('First payment')).toBeVisible({ timeout: 8000 });
  35  |     await expect(page.getByText('Second payment')).toBeVisible();
  36  |   });
  37  | 
  38  |   test('sign button is disabled until all fields are filled', async ({ page }) => {
  39  |     await mockContractGet(page);
  40  | 
  41  |     const signPage = new ContractSignPage(page);
  42  |     await signPage.goto(CONTRACT_TOKEN);
  43  | 
  44  |     // Wait for page to load
  45  |     await expect(page.getByRole('heading', { name: mockContract.title })).toBeVisible({ timeout: 8000 });
  46  | 
  47  |     await expect(signPage.signButton).toBeDisabled();
  48  | 
  49  |     await signPage.nameInput.fill('John Doe');
  50  |     await expect(signPage.signButton).toBeDisabled();
  51  | 
  52  |     // Still disabled — no signature and no checkboxes checked
  53  |   });
  54  | 
  55  |   test('successful sign shows success screen', async ({ page }) => {
  56  |     await mockContractGet(page);
  57  |     await mockContractSign(page);
  58  | 
  59  |     const signPage = new ContractSignPage(page);
  60  |     await signPage.goto(CONTRACT_TOKEN);
  61  | 
  62  |     await expect(page.getByRole('heading', { name: mockContract.title })).toBeVisible({ timeout: 8000 });
  63  | 
  64  |     await signPage.fillSignForm('John Doe', 'john@example.com');
  65  |     await signPage.signButton.click();
  66  | 
  67  |     await expect(signPage.successHeading).toBeVisible({ timeout: 8000 });
  68  |   });
  69  | 
  70  |   test('pay now button redirects to payment URL', async ({ page }) => {
  71  |     await mockContractGet(page, mockSignedContract);
  72  |     await mockContractCheckout(page);
  73  | 
  74  |     const signPage = new ContractSignPage(page);
  75  |     await signPage.goto(CONTRACT_TOKEN);
  76  | 
  77  |     // Already signed — success screen renders immediately
  78  |     await expect(signPage.successHeading).toBeVisible({ timeout: 8000 });
  79  | 
  80  |     let redirectedTo = '';
  81  |     page.on('framenavigated', (frame) => {
  82  |       if (frame === page.mainFrame()) {
  83  |         redirectedTo = frame.url();
  84  |       }
  85  |     });
  86  | 
  87  |     await signPage.payButton.click();
  88  |     await page.waitForFunction(
  89  |       () => window.location.href.includes('pay.example.com'),
  90  |       { timeout: 8000 },
  91  |     ).catch(() => {});
  92  | 
> 93  |     expect(redirectedTo || page.url()).toContain('pay.example.com');
      |                                        ^ Error: expect(received).toContain(expected) // indexOf
  94  |   });
  95  | 
  96  |   test('shows error state when contract not found', async ({ page }) => {
  97  |     await page.route(`/api/contracts/${CONTRACT_TOKEN}`, (route) =>
  98  |       route.fulfill({ status: 404, json: { detail: 'contract_not_found' } }),
  99  |     );
  100 | 
  101 |     const signPage = new ContractSignPage(page);
  102 |     await signPage.goto(CONTRACT_TOKEN);
  103 | 
  104 |     await expect(signPage.notFoundHeading).toBeVisible({ timeout: 8000 });
  105 |   });
  106 | 
  107 |   test('already-signed contract shows success screen directly', async ({ page }) => {
  108 |     await mockContractGet(page, mockSignedContract);
  109 |     await mockContractCheckout(page);
  110 | 
  111 |     const signPage = new ContractSignPage(page);
  112 |     await signPage.goto(CONTRACT_TOKEN);
  113 | 
  114 |     await expect(signPage.successHeading).toBeVisible({ timeout: 8000 });
  115 |     await expect(signPage.signButton).not.toBeVisible();
  116 |   });
  117 | });
  118 | 
```
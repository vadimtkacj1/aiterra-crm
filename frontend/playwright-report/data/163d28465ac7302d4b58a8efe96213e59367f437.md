# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\contract-sign.spec.ts >> Contract sign page >> pay now button calls checkout API
- Location: e2e\tests\contract-sign.spec.ts:70:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - banner [ref=e5]:
    - generic [ref=e6]:
      - img "safety-certificate" [ref=e8]:
        - img [ref=e9]
      - text: Secure signing
    - generic [ref=e11]:
      - img "lock" [ref=e12]:
        - img [ref=e13]
      - text: TLS · Encrypted session
  - main [ref=e15]:
    - generic [ref=e16]:
      - generic [ref=e17]: Contract
      - heading "Service Agreement" [level=3] [ref=e18]
      - generic [ref=e19]:
        - generic [ref=e20]: Due now
        - generic [ref=e21]:
          - generic [ref=e22]: First payment
          - strong [ref=e24]: ₪2,500.00
        - generic [ref=e25]:
          - generic [ref=e26]: Second payment
          - strong [ref=e28]: ₪2,500.00
        - separator [ref=e29]
        - generic [ref=e30]:
          - strong [ref=e32]: Total
          - heading "₪5,000.00" [level=2] [ref=e33]
      - button "credit-card Pay now ₪5,000.00" [ref=e34] [cursor=pointer]:
        - img "credit-card" [ref=e36]:
          - img [ref=e37]
        - generic [ref=e39]: Pay now ₪5,000.00
      - generic [ref=e40]: All items processed in one secure transaction
      - generic [ref=e41]:
        - img "lock" [ref=e42]:
          - img [ref=e43]
        - text: You'll be redirected to our secure payment portal
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
  70  |   test('pay now button calls checkout API', async ({ page }) => {
  71  |     await mockContractGet(page, mockSignedContract);
  72  | 
  73  |     let checkoutCalled = false;
  74  |     await page.route(`/api/contracts/${CONTRACT_TOKEN}/checkout`, async (route) => {
  75  |       checkoutCalled = true;
  76  |       await route.fulfill({
  77  |         json: {
  78  |           status: 'ok',
  79  |           gateway: 'zcredit',
  80  |           sessionId: 'session-123',
  81  |           paymentUrl: 'https://pay.example.com/session-123',
  82  |           stage: { id: 1, sortOrder: 0, description: 'First payment', amount: 2500, status: 'invoiced', paidAt: null },
  83  |         },
  84  |       });
  85  |     });
  86  | 
  87  |     const signPage = new ContractSignPage(page);
  88  |     await signPage.goto(CONTRACT_TOKEN);
  89  | 
  90  |     // Already signed — success screen renders immediately
  91  |     await expect(signPage.successHeading).toBeVisible({ timeout: 8000 });
  92  | 
  93  |     await signPage.payButton.click();
  94  |     await page.waitForTimeout(1000);
  95  | 
> 96  |     expect(checkoutCalled).toBe(true);
      |                            ^ Error: expect(received).toBe(expected) // Object.is equality
  97  |   });
  98  | 
  99  |   test('shows error state when contract not found', async ({ page }) => {
  100 |     await page.route(`/api/contracts/${CONTRACT_TOKEN}`, (route) =>
  101 |       route.fulfill({ status: 404, json: { detail: 'contract_not_found' } }),
  102 |     );
  103 | 
  104 |     const signPage = new ContractSignPage(page);
  105 |     await signPage.goto(CONTRACT_TOKEN);
  106 | 
  107 |     await expect(signPage.notFoundHeading).toBeVisible({ timeout: 8000 });
  108 |   });
  109 | 
  110 |   test('already-signed contract shows success screen directly', async ({ page }) => {
  111 |     await mockContractGet(page, mockSignedContract);
  112 |     await mockContractCheckout(page);
  113 | 
  114 |     const signPage = new ContractSignPage(page);
  115 |     await signPage.goto(CONTRACT_TOKEN);
  116 | 
  117 |     await expect(signPage.successHeading).toBeVisible({ timeout: 8000 });
  118 |     await expect(signPage.signButton).not.toBeVisible();
  119 |   });
  120 | });
  121 | 
```
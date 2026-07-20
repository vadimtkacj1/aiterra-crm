# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\settings.spec.ts >> Settings — change password >> short new password shows client-side validation without calling API
- Location: e2e\tests\settings.spec.ts:59:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('Current password')
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for getByLabel('Current password')

```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { injectAuth, FAKE_USER } from '../helpers/auth';
  3  | import { mockAccountsList, mockChangePassword, mockChangePasswordFail } from '../helpers/mocks';
  4  | import { SettingsPage } from '../pages/SettingsPage';
  5  | 
  6  | const ACCOUNT_ID = '10';
  7  | 
  8  | test.describe('Settings — change password', () => {
  9  |   test.beforeEach(async ({ page }) => {
  10 |     await injectAuth(page, FAKE_USER);
  11 |     await mockAccountsList(page);
  12 |   });
  13 | 
  14 |   test('shows all three password fields and save button', async ({ page }) => {
  15 |     const settingsPage = new SettingsPage(page);
  16 |     await settingsPage.goto(ACCOUNT_ID);
  17 | 
  18 |     // Verify we are on the settings page and the form rendered
  19 |     await expect(page).toHaveURL(/\/settings/, { timeout: 8000 });
  20 |     await expect(page.getByText('Settings')).toBeVisible({ timeout: 8000 });
  21 |     await expect(settingsPage.currentPasswordInput).toBeVisible({ timeout: 8000 });
  22 |     await expect(settingsPage.newPasswordInput).toBeVisible();
  23 |     await expect(settingsPage.confirmPasswordInput).toBeVisible();
  24 |     await expect(settingsPage.saveButton).toBeVisible();
  25 |   });
  26 | 
  27 |   test('successful password change shows success feedback', async ({ page }) => {
  28 |     await mockChangePassword(page);
  29 | 
  30 |     const settingsPage = new SettingsPage(page);
  31 |     await settingsPage.goto(ACCOUNT_ID);
  32 |     await expect(settingsPage.currentPasswordInput).toBeVisible({ timeout: 8000 });
  33 |     await settingsPage.fillPasswordForm('oldPass123', 'NewPass456!', 'NewPass456!');
  34 | 
  35 |     await expect(
  36 |       page.getByRole('alert')
  37 |         .or(page.getByRole('status'))
  38 |         .or(page.locator('[class*="ant-message"]'))
  39 |         .first(),
  40 |     ).toBeVisible({ timeout: 8000 });
  41 |   });
  42 | 
  43 |   test('API error shows error feedback', async ({ page }) => {
  44 |     await mockChangePasswordFail(page);
  45 | 
  46 |     const settingsPage = new SettingsPage(page);
  47 |     await settingsPage.goto(ACCOUNT_ID);
  48 |     await expect(settingsPage.currentPasswordInput).toBeVisible({ timeout: 8000 });
  49 |     await settingsPage.fillPasswordForm('wrongOld', 'NewPass456!', 'NewPass456!');
  50 | 
  51 |     await expect(
  52 |       page.getByRole('alert')
  53 |         .or(page.getByRole('status'))
  54 |         .or(page.locator('[class*="ant-message"]'))
  55 |         .first(),
  56 |     ).toBeVisible({ timeout: 8000 });
  57 |   });
  58 | 
  59 |   test('short new password shows client-side validation without calling API', async ({ page }) => {
  60 |     let apiCalled = false;
  61 |     await page.route('/api/auth/change-password', () => {
  62 |       apiCalled = true;
  63 |     });
  64 | 
  65 |     const settingsPage = new SettingsPage(page);
  66 |     await settingsPage.goto(ACCOUNT_ID);
> 67 |     await expect(settingsPage.currentPasswordInput).toBeVisible({ timeout: 8000 });
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  68 |     await settingsPage.fillPasswordForm('oldPass123', 'short', 'short');
  69 | 
  70 |     await page.waitForTimeout(500);
  71 |     expect(apiCalled).toBe(false);
  72 |   });
  73 | });
  74 | 
```
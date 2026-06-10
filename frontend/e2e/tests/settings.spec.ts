import { expect, test } from '@playwright/test';
import { injectAuth, FAKE_USER } from '../helpers/auth';
import { mockAccountsList, mockChangePassword, mockChangePasswordFail } from '../helpers/mocks';
import { SettingsPage } from '../pages/SettingsPage';

const ACCOUNT_ID = '10';

test.describe('Settings — change password', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, FAKE_USER);
    await mockAccountsList(page);
  });

  test('shows all three password fields and save button', async ({ page }) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto(ACCOUNT_ID);

    // Verify we are on the settings page and the form rendered
    await expect(page).toHaveURL(/\/settings/, { timeout: 8000 });
    await expect(page.getByText('Settings')).toBeVisible({ timeout: 8000 });
    await expect(settingsPage.currentPasswordInput).toBeVisible({ timeout: 8000 });
    await expect(settingsPage.newPasswordInput).toBeVisible();
    await expect(settingsPage.confirmPasswordInput).toBeVisible();
    await expect(settingsPage.saveButton).toBeVisible();
  });

  test('successful password change shows success feedback', async ({ page }) => {
    await mockChangePassword(page);

    const settingsPage = new SettingsPage(page);
    await settingsPage.goto(ACCOUNT_ID);
    await expect(settingsPage.currentPasswordInput).toBeVisible({ timeout: 8000 });
    await settingsPage.fillPasswordForm('oldPass123', 'NewPass456!', 'NewPass456!');

    await expect(
      page.getByRole('alert')
        .or(page.getByRole('status'))
        .or(page.locator('[class*="ant-message"]'))
        .first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test('API error shows error feedback', async ({ page }) => {
    await mockChangePasswordFail(page);

    const settingsPage = new SettingsPage(page);
    await settingsPage.goto(ACCOUNT_ID);
    await expect(settingsPage.currentPasswordInput).toBeVisible({ timeout: 8000 });
    await settingsPage.fillPasswordForm('wrongOld', 'NewPass456!', 'NewPass456!');

    await expect(
      page.getByRole('alert')
        .or(page.getByRole('status'))
        .or(page.locator('[class*="ant-message"]'))
        .first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test('short new password shows client-side validation without calling API', async ({ page }) => {
    let apiCalled = false;
    await page.route('/api/auth/change-password', () => {
      apiCalled = true;
    });

    const settingsPage = new SettingsPage(page);
    await settingsPage.goto(ACCOUNT_ID);
    await expect(settingsPage.currentPasswordInput).toBeVisible({ timeout: 8000 });
    await settingsPage.fillPasswordForm('oldPass123', 'short', 'short');

    await page.waitForTimeout(500);
    expect(apiCalled).toBe(false);
  });
});

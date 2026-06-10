import { expect, test } from '@playwright/test';
import { injectAuth, FAKE_USER } from '../helpers/auth';
import { AccountsPage } from '../pages/AccountsPage';

const TWO_ACCOUNTS = [
  { id: 10, name: 'Alpha Corp', hasMeta: false },
  { id: 11, name: 'Beta Inc', hasMeta: true },
];

const FIVE_ACCOUNTS = [
  { id: 10, name: 'Alpha Corp', hasMeta: false },
  { id: 11, name: 'Beta Inc', hasMeta: true },
  { id: 12, name: 'Gamma LLC', hasMeta: false },
  { id: 13, name: 'Delta Co', hasMeta: false },
  { id: 14, name: 'Epsilon Ltd', hasMeta: false },
];

test.describe('Account selection page', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, FAKE_USER);
  });

  test('shows all account names with Open buttons', async ({ page }) => {
    await page.route('/api/accounts', (route) =>
      route.fulfill({ json: TWO_ACCOUNTS }),
    );

    const accountsPage = new AccountsPage(page);
    await accountsPage.goto();

    await expect(accountsPage.accountName('Alpha Corp')).toBeVisible({ timeout: 8000 });
    await expect(accountsPage.accountName('Beta Inc')).toBeVisible();
    await expect(accountsPage.openButton(0)).toBeVisible();
    await expect(accountsPage.openButton(1)).toBeVisible();
  });

  test('hasMeta account shows Meta ads badge, non-meta shows Payments only badge', async ({
    page,
  }) => {
    await page.route('/api/accounts', (route) =>
      route.fulfill({ json: TWO_ACCOUNTS }),
    );

    const accountsPage = new AccountsPage(page);
    await accountsPage.goto();

    await expect(page.getByText('Meta ads')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Payments only')).toBeVisible();
  });

  test('single account auto-redirects away from /accounts', async ({ page }) => {
    await page.route('/api/accounts', (route) =>
      route.fulfill({ json: [{ id: 10, name: 'Test Business', hasMeta: false }] }),
    );

    await page.goto('/accounts');

    await expect(page).not.toHaveURL('/accounts', { timeout: 8000 });
    await expect(page).toHaveURL(/\/a\/10\//, { timeout: 8000 });
  });

  test('search input appears when more than 4 accounts', async ({ page }) => {
    await page.route('/api/accounts', (route) =>
      route.fulfill({ json: FIVE_ACCOUNTS }),
    );

    const accountsPage = new AccountsPage(page);
    await accountsPage.goto();

    await expect(accountsPage.searchInput).toBeVisible({ timeout: 8000 });
  });

  test('search filters account list by name', async ({ page }) => {
    await page.route('/api/accounts', (route) =>
      route.fulfill({ json: FIVE_ACCOUNTS }),
    );

    const accountsPage = new AccountsPage(page);
    await accountsPage.goto();

    await accountsPage.searchInput.waitFor({ state: 'visible', timeout: 8000 });
    await accountsPage.searchInput.fill('Alpha');

    await expect(accountsPage.accountName('Alpha Corp')).toBeVisible();
    await expect(accountsPage.accountName('Beta Inc')).not.toBeVisible();
  });
});

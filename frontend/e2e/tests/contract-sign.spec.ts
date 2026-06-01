import { expect, test } from '@playwright/test';
import { forceEnglish } from '../helpers/auth';
import {
  CONTRACT_TOKEN,
  mockContract,
  mockContractCheckout,
  mockContractGet,
  mockContractSign,
  mockSignedContract,
} from '../helpers/mocks';
import { ContractSignPage } from '../pages/ContractSignPage';

test.describe('Contract sign page', () => {
  test.beforeEach(async ({ page }) => {
    await forceEnglish(page);
  });

  test('renders contract title after loading', async ({ page }) => {
    await mockContractGet(page);

    const signPage = new ContractSignPage(page);
    await signPage.goto(CONTRACT_TOKEN);

    await expect(page.getByRole('heading', { name: mockContract.title })).toBeVisible({ timeout: 8000 });
  });

  test('shows both payment stages', async ({ page }) => {
    await mockContractGet(page);

    const signPage = new ContractSignPage(page);
    await signPage.goto(CONTRACT_TOKEN);

    // Wait for contract to load, then check stage descriptions from mock data
    await expect(page.getByText('First payment')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Second payment')).toBeVisible();
  });

  test('sign button is disabled until all fields are filled', async ({ page }) => {
    await mockContractGet(page);

    const signPage = new ContractSignPage(page);
    await signPage.goto(CONTRACT_TOKEN);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: mockContract.title })).toBeVisible({ timeout: 8000 });

    await expect(signPage.signButton).toBeDisabled();

    await signPage.nameInput.fill('John Doe');
    await expect(signPage.signButton).toBeDisabled();

    // Still disabled — no signature and no checkboxes checked
  });

  test('successful sign shows success screen', async ({ page }) => {
    await mockContractGet(page);
    await mockContractSign(page);

    const signPage = new ContractSignPage(page);
    await signPage.goto(CONTRACT_TOKEN);

    await expect(page.getByRole('heading', { name: mockContract.title })).toBeVisible({ timeout: 8000 });

    await signPage.fillSignForm('John Doe', 'john@example.com');
    await signPage.signButton.click();

    await expect(signPage.successHeading).toBeVisible({ timeout: 8000 });
  });

  test('pay now button redirects to payment URL', async ({ page }) => {
    await mockContractGet(page, mockSignedContract);
    await mockContractCheckout(page);

    const signPage = new ContractSignPage(page);
    await signPage.goto(CONTRACT_TOKEN);

    // Already signed — success screen renders immediately
    await expect(signPage.successHeading).toBeVisible({ timeout: 8000 });

    let redirectedTo = '';
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        redirectedTo = frame.url();
      }
    });

    await signPage.payButton.click();
    await page.waitForFunction(
      () => window.location.href.includes('pay.example.com'),
      { timeout: 8000 },
    ).catch(() => {});

    expect(redirectedTo || page.url()).toContain('pay.example.com');
  });

  test('shows error state when contract not found', async ({ page }) => {
    await page.route(`/api/contracts/${CONTRACT_TOKEN}`, (route) =>
      route.fulfill({ status: 404, json: { detail: 'contract_not_found' } }),
    );

    const signPage = new ContractSignPage(page);
    await signPage.goto(CONTRACT_TOKEN);

    await expect(signPage.notFoundHeading).toBeVisible({ timeout: 8000 });
  });

  test('already-signed contract shows success screen directly', async ({ page }) => {
    await mockContractGet(page, mockSignedContract);
    await mockContractCheckout(page);

    const signPage = new ContractSignPage(page);
    await signPage.goto(CONTRACT_TOKEN);

    await expect(signPage.successHeading).toBeVisible({ timeout: 8000 });
    await expect(signPage.signButton).not.toBeVisible();
  });
});

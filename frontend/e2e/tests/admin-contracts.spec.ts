import { expect, test } from '@playwright/test';
import { injectAuth, FAKE_ADMIN } from '../helpers/auth';
import {
  mockAdminContract,
  mockAdminContractsList,
  mockAdminContractSend,
  mockAdminContractVoid,
  mockAdminUsers,
} from '../helpers/mocks';

test.describe('Admin — contracts', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, FAKE_ADMIN);
    await mockAdminUsers(page);
  });

  test('lists contracts in the table', async ({ page }) => {
    await mockAdminContractsList(page);

    await page.goto('/admin/contracts');

    await expect(page.getByRole('table')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Service Agreement')).toBeVisible();
  });

  test('shows Draft status badge for draft contract', async ({ page }) => {
    await mockAdminContractsList(page);

    await page.goto('/admin/contracts');

    await expect(page.getByText('Draft')).toBeVisible({ timeout: 8000 });
  });

  test('opens new contract modal on button click', async ({ page }) => {
    await mockAdminContractsList(page);

    await page.goto('/admin/contracts');

    await page.getByRole('button', { name: 'New Contract' }).click();

    await expect(
      page.getByPlaceholder('e.g. Annual Service Agreement').or(
        page.getByText('Contract title'),
      ).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('send contract updates status to Awaiting signature', async ({ page }) => {
    await mockAdminContractsList(page);
    await mockAdminContractSend(page, mockAdminContract.id);

    await page.goto('/admin/contracts');

    // The send button is an icon-only button (SendOutlined) — match by icon aria-label
    await page.getByRole('button', { name: 'send' }).first().click();

    await expect(page.getByText('Awaiting signature')).toBeVisible({ timeout: 8000 });
  });

  test('void contract triggers confirmation then updates status', async ({ page }) => {
    await mockAdminContractsList(page);
    await mockAdminContractVoid(page, mockAdminContract.id);

    await page.goto('/admin/contracts');

    // The void button is MinusCircleOutlined — match by icon aria-label
    await page.getByRole('button', { name: 'minus-circle' }).first().click();

    // Ant Design Modal.confirm — click OK
    await page.getByRole('button', { name: 'OK' }).click();

    await expect(page.getByText('Voided').first()).toBeVisible({ timeout: 8000 });
  });

  test('shows empty table when no contracts exist', async ({ page }) => {
    await mockAdminContractsList(page, []);

    await page.goto('/admin/contracts');

    await expect(page.getByRole('table')).toBeVisible({ timeout: 8000 });
    // Verify the mocked contract title is absent (no data rows rendered)
    await expect(page.getByText('Service Agreement')).not.toBeVisible();
  });
});

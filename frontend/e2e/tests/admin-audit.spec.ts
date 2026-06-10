import { expect, test } from '@playwright/test';
import { injectAuth, FAKE_ADMIN } from '../helpers/auth';
import { mockAdminAuditLogs, mockAdminUsers, mockAuditLogEntry } from '../helpers/mocks';
import { AdminAuditPage } from '../pages/AdminAuditPage';

test.describe('Admin — audit logs', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, FAKE_ADMIN);
    await mockAdminUsers(page);
  });

  test('shows audit log table with log entries', async ({ page }) => {
    await mockAdminAuditLogs(page);

    const auditPage = new AdminAuditPage(page);
    await auditPage.goto();

    await expect(auditPage.auditTable).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(mockAuditLogEntry.adminEmail)).toBeVisible();
  });

  test('shows action column in table', async ({ page }) => {
    await mockAdminAuditLogs(page);

    const auditPage = new AdminAuditPage(page);
    await auditPage.goto();

    await expect(page.getByText(mockAuditLogEntry.action)).toBeVisible({ timeout: 8000 });
  });

  test('reload button is visible', async ({ page }) => {
    await mockAdminAuditLogs(page);

    const auditPage = new AdminAuditPage(page);
    await auditPage.goto();

    await expect(auditPage.reloadButton).toBeVisible({ timeout: 8000 });
  });

  test('table shows no log rows when empty', async ({ page }) => {
    await mockAdminAuditLogs(page, []);

    const auditPage = new AdminAuditPage(page);
    await auditPage.goto();

    await expect(auditPage.auditTable).toBeVisible({ timeout: 8000 });
    // Verify the mocked admin email is absent (no data rows)
    await expect(page.getByText(mockAuditLogEntry.adminEmail)).not.toBeVisible();
  });
});

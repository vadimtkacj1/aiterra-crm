import type { Page } from '@playwright/test';

export const FAKE_USER = {
  id: '1',
  email: 'user@test.com',
  displayName: 'Test User',
  role: 'user' as const,
};

export const FAKE_ADMIN = {
  id: '1',
  email: 'admin@test.com',
  displayName: 'Admin User',
  role: 'admin' as const,
};

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

export function makeToken(userId: string, role: string): string {
  return makeFakeJwt({
    sub: userId,
    role,
    exp: Math.floor(Date.now() / 1000) + 86400,
  });
}

/** Inject auth + force English locale into localStorage before page scripts run. */
export async function injectAuth(
  page: Page,
  user: typeof FAKE_USER | typeof FAKE_ADMIN,
): Promise<void> {
  const token = makeToken(user.id, user.role);
  await page.addInitScript(
    ({ tokenKey, token, user }) => {
      localStorage.setItem(tokenKey, token);
      localStorage.setItem(`${tokenKey}_user`, JSON.stringify(user));
      localStorage.setItem('crm_lang', 'en');
    },
    { tokenKey: 'crm_auth_token', token, user },
  );
}

/** Force English locale for public pages (no auth needed). */
export async function forceEnglish(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('crm_lang', 'en');
  });
}

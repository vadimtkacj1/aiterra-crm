/** Remember last opened business so sidebar links work from global routes. */
export const LAST_VISITED_ACCOUNT_STORAGE_KEY = "crm_last_account_id";

export function readLastVisitedAccountId(): string | null {
  try {
    const v = sessionStorage.getItem(LAST_VISITED_ACCOUNT_STORAGE_KEY);
    return v && /^\d+$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

export const Paths = {
  accounts: "/accounts",
  /** @deprecated Use accountPath(id, "settings") — kept for redirects only */
  settings: "/settings",
  account: "/a/:accountId",
  meta: "/a/:accountId/meta",
  metaCampaign: "/a/:accountId/meta/campaigns/:campaignId",
  google: "/a/:accountId/google",
  billing: "/a/:accountId/billing",
  billingCheckout: "/a/:accountId/billing/checkout",
  admin: "/admin",
  adminStatistics: "/admin/statistics",
  adminUsers: "/admin/users",
  adminPayments: "/admin/payments",
  adminMetaBudget: "/admin/meta-budget",
  adminAudit: "/admin/audit",
  login: "/login",
  pricing: "/pricing",
  terms: "/terms",
  takanon: "/takanon",
  root: "/",
  /** CRM guide (authenticated). */
  help: "/help",
} as const;

export type AppPath = (typeof Paths)[keyof typeof Paths];

export function accountPath(accountId: string, section: "meta" | "google" | "billing" | "settings"): string {
  return `/a/${accountId}/${section}`;
}

export function accountCampaignPath(accountId: string, campaignId: string): string {
  return `/a/${accountId}/meta/campaigns/${campaignId}`;
}

/** Landing section after picking a business: Meta only when a campaign is linked. */
export function defaultAccountSection(account: { hasMeta: boolean }): "meta" | "billing" {
  return account.hasMeta ? "meta" : "billing";
}


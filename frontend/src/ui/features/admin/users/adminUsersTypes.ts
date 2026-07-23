import type { UserRole } from "@/domain/User";

export type LinkMeta = "with" | "without";
export type LinkGoogle = "with" | "without";

/** Fields shared by the create + edit forms — the integration link sections.
    The shared field components (`AdminUsers*LinkFields`) are typed against this
    subset so one implementation serves both forms. */
export type AdminUserLinkFormValues = {
  linkMeta: LinkMeta;
  metaCampaignId?: string;
  linkGoogle: LinkGoogle;
  googleCustomerId?: string;
  googleDeveloperToken?: string;
  googleRefreshToken?: string;
  googleLoginCustomerId?: string;
  linkSite: boolean;
  siteUrl?: string;
  notifyChannel?: string;
  waNotifyMessage?: string;
  emailNotifySubject?: string;
  emailNotifyMessage?: string;
};

export type AdminCreateUserFormValues = AdminUserLinkFormValues & {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  phone?: string;
};

export type AdminEditUserFormValues = AdminUserLinkFormValues & {
  displayName: string;
  role: UserRole;
  billingChargeType?: "none" | "one_time" | "monthly";
  billingAmount?: number | null;
  billingCurrency?: string;
  billingDescription?: string;
};

/* Optional text fields default to `undefined` (not "") on purpose: the create
   payload includes some of them via truthiness/`?.trim()` checks, and antd left
   untouched fields as `undefined`. Keeping that shape keeps payloads identical. */

export const ADMIN_CREATE_USER_DEFAULTS: AdminCreateUserFormValues = {
  email: "",
  password: "",
  displayName: "",
  phone: "",
  role: "user",
  linkMeta: "without",
  metaCampaignId: undefined,
  linkGoogle: "without",
  googleCustomerId: undefined,
  googleDeveloperToken: undefined,
  googleRefreshToken: undefined,
  googleLoginCustomerId: undefined,
  linkSite: false,
  siteUrl: undefined,
  notifyChannel: "whatsapp",
  waNotifyMessage: undefined,
  emailNotifySubject: undefined,
  emailNotifyMessage: undefined,
};

/* Billing fields stay `undefined` here: `submitAdminUserEdit` uses
   `billingChargeType !== undefined` to decide whether billing is saved at all
   (it is only prefetched for accounts that have one). */
export const ADMIN_EDIT_USER_DEFAULTS: AdminEditUserFormValues = {
  displayName: "",
  role: "user",
  linkMeta: "without",
  metaCampaignId: undefined,
  linkGoogle: "without",
  googleCustomerId: undefined,
  googleDeveloperToken: undefined,
  googleRefreshToken: undefined,
  googleLoginCustomerId: undefined,
  linkSite: false,
  siteUrl: undefined,
  notifyChannel: "whatsapp",
  waNotifyMessage: undefined,
  emailNotifySubject: undefined,
  emailNotifyMessage: undefined,
  billingChargeType: undefined,
  billingAmount: undefined,
  billingCurrency: undefined,
  billingDescription: undefined,
};

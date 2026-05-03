import type { UserRole } from "@/domain/User";

export type LinkMeta = "with" | "without";
export type LinkGoogle = "with" | "without";

export type AdminCreateUserFormValues = {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  linkMeta: LinkMeta;
  metaCampaignId?: string;
  linkGoogle: LinkGoogle;
  googleCustomerId?: string;
  googleDeveloperToken?: string;
  googleRefreshToken?: string;
  googleLoginCustomerId?: string;
};

export type AdminEditUserFormValues = {
  displayName: string;
  role: UserRole;
  linkMeta: LinkMeta;
  metaCampaignId?: string;
  linkGoogle: LinkGoogle;
  googleCustomerId?: string;
  googleDeveloperToken?: string;
  googleRefreshToken?: string;
  googleLoginCustomerId?: string;
  billingChargeType: "none" | "one_time" | "monthly";
  billingAmount?: number | null;
  billingCurrency?: string;
  billingDescription?: string;
};

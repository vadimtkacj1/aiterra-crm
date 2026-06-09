export interface SiteConfig {
  publicToken: string | null;
  siteUrl: string | null;
  gmbUrl: string | null;
  popupText: string | null;
  popupImageBase64: string | null;
  notifyChannel: string | null;
  waOwnerPhone: string | null;
  waNotifyMessage: string | null;
  emailNotifySubject: string | null;
  emailNotifyMessage: string | null;
}

export interface SiteConfigUpdateInput {
  siteUrl?: string | null;
  gmbUrl?: string | null;
  popupText?: string | null;
  popupImageBase64?: string | null;
  notifyChannel?: string | null;
  waOwnerPhone?: string | null;
  waNotifyMessage?: string | null;
  emailNotifySubject?: string | null;
  emailNotifyMessage?: string | null;
}

export interface SiteLead {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  treatment: string | null;
  source: string | null;
  createdAt: string;
}

export interface SiteLeadAdmin extends SiteLead {
  accountId: number;
  accountName: string;
}

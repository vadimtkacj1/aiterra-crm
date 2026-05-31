export interface SiteConfig {
  siteUrl: string | null;
  gmbUrl: string | null;
  popupText: string | null;
  popupImageBase64: string | null;
}

export interface SiteConfigUpdateInput {
  siteUrl?: string | null;
  gmbUrl?: string | null;
  popupText?: string | null;
  popupImageBase64?: string | null;
}

export interface SiteLead {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  source: string | null;
  createdAt: string;
}

export interface SiteLeadAdmin extends SiteLead {
  accountId: number;
  accountName: string;
}

import type { SiteConfig, SiteConfigUpdateInput, SiteLead } from "@/domain/Site";

export interface ISiteService {
  getConfig(accountId: string): Promise<SiteConfig>;
  updateConfig(accountId: string, input: SiteConfigUpdateInput): Promise<SiteConfig>;
  regenerateToken(accountId: string): Promise<SiteConfig>;
  listLeads(accountId: string): Promise<SiteLead[]>;
  sendTestNotification(accountId: string, email: string): Promise<void>;
}

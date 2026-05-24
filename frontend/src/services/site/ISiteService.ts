import type { SiteConfig, SiteConfigUpdateInput, SiteLead } from "@/domain/Site";

export interface ISiteService {
  getConfig(accountId: string): Promise<SiteConfig>;
  updateConfig(accountId: string, input: SiteConfigUpdateInput): Promise<SiteConfig>;
  listLeads(accountId: string): Promise<SiteLead[]>;
}

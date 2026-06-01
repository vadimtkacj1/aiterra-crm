import type { HttpClient } from "@/infrastructure/HttpClient";
import type { SiteConfig, SiteConfigUpdateInput, SiteLead } from "@/domain/Site";
import type { ISiteService } from "./ISiteService";

export class SiteService implements ISiteService {
  constructor(private readonly http: HttpClient) {}

  getConfig(accountId: string): Promise<SiteConfig> {
    return this.http.get<SiteConfig>(`/accounts/${accountId}/site-config`);
  }

  updateConfig(accountId: string, input: SiteConfigUpdateInput): Promise<SiteConfig> {
    return this.http.put<SiteConfig>(`/accounts/${accountId}/site-config`, input);
  }

  regenerateToken(accountId: string): Promise<SiteConfig> {
    return this.http.post<SiteConfig>(`/accounts/${accountId}/site-config/regenerate-token`, {});
  }

  listLeads(accountId: string): Promise<SiteLead[]> {
    return this.http.get<SiteLead[]>(`/accounts/${accountId}/site-leads`);
  }
}

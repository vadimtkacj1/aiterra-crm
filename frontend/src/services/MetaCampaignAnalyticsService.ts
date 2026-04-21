import type { Env } from "../config/Env";
import type { CampaignAdsData, CampaignAnalyticsSnapshot, MetaAccountBilling } from "../domain/CampaignAnalytics";
import type { HttpClient } from "../infrastructure/HttpClient";
import type {
  IMetaCampaignAnalyticsService,
  MetaAdAccountOption,
  MetaAppConfig,
  MetaCampaignOption,
} from "./interfaces/IMetaCampaignAnalyticsService";

export class MetaCampaignAnalyticsService implements IMetaCampaignAnalyticsService {
  constructor(
    private readonly env: Env,
    private readonly http: HttpClient,
  ) {}

  fetchSnapshot(accountId: string, since?: string, until?: string): Promise<CampaignAnalyticsSnapshot> {
    const params = new URLSearchParams();
    if (since) params.set("since", since);
    if (until) params.set("until", until);
    const qs = params.toString();
    return this.http.get<CampaignAnalyticsSnapshot>(`/meta/snapshot/${accountId}${qs ? `?${qs}` : ""}`);
  }

  fetchCampaignAds(accountId: string, campaignId: string, since?: string, until?: string): Promise<CampaignAdsData> {
    const params = new URLSearchParams({ account_id: accountId });
    if (since) params.set("since", since);
    if (until) params.set("until", until);
    return this.http.get<CampaignAdsData>(`/meta/campaigns/${campaignId}/ads?${params.toString()}`);
  }

  fetchMetaBilling(accountId: string): Promise<MetaAccountBilling> {
    return this.http.get<MetaAccountBilling>(`/meta/billing/${accountId}`);
  }

  async linkCampaign(accountId: number, metaCampaignId: string, name: string): Promise<void> {
    await this.http.post(`/meta/campaigns/track`, {
      account_id: accountId,
      meta_campaign_id: metaCampaignId,
      name,
    });
  }

  async listMetaAdAccounts(accessToken: string): Promise<MetaAdAccountOption[]> {
    const res = await this.http.post<{ accounts: MetaAdAccountOption[] }>(`/meta/ad-accounts/list`, {
      access_token: accessToken,
    });
    return res.accounts ?? [];
  }

  async connectMeta(accountId: number, accessToken: string, adAccountId: string): Promise<void> {
    await this.http.post(`/meta/connect`, {
      account_id: accountId,
      access_token: accessToken,
      ad_account_id: adAccountId,
    });
  }

  async getMetaAppConfig(): Promise<MetaAppConfig> {
    const fromEnv = this.env.metaAppId || null;
    const remote = await this.http.get<MetaAppConfig>(`/meta/app-config`);
    return { appId: remote.appId ?? fromEnv };
  }

  async listAvailableCampaigns(): Promise<MetaCampaignOption[]> {
    return this.http.get<MetaCampaignOption[]>(`/meta/campaigns/available`);
  }
}

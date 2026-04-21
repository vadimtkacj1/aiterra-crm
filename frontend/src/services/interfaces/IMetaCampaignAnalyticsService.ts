import type { CampaignAdsData, CampaignAnalyticsSnapshot, MetaAccountBilling } from "../../domain/CampaignAnalytics";

export type MetaAdAccountOption = { id: string; name: string };
export type MetaCampaignOption = { id: string; name: string };

export type MetaAppConfig = { appId: string | null };

export interface IMetaCampaignAnalyticsService {
  fetchSnapshot(accountId: string, since?: string, until?: string): Promise<CampaignAnalyticsSnapshot>;
  fetchCampaignAds(accountId: string, campaignId: string, since?: string, until?: string): Promise<CampaignAdsData>;
  fetchMetaBilling(accountId: string): Promise<MetaAccountBilling>;
  linkCampaign(accountId: number, metaCampaignId: string, name: string): Promise<void>;
  listMetaAdAccounts(accessToken: string): Promise<MetaAdAccountOption[]>;
  connectMeta(accountId: number, accessToken: string, adAccountId: string): Promise<void>;
  getMetaAppConfig(): Promise<MetaAppConfig>;
  listAvailableCampaigns(): Promise<MetaCampaignOption[]>;
}

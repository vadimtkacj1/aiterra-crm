import type { CampaignAnalyticsSnapshot } from "../../domain/CampaignAnalytics";

export interface IGoogleCampaignAnalyticsService {
  fetchSnapshot(accountId: string): Promise<CampaignAnalyticsSnapshot>;
}

import type { Env } from "../config/Env";
import type { CampaignAnalyticsSnapshot } from "../domain/CampaignAnalytics";
import type { HttpClient } from "../infrastructure/HttpClient";
import type { IGoogleCampaignAnalyticsService } from "./interfaces/IGoogleCampaignAnalyticsService";

export class GoogleCampaignAnalyticsService implements IGoogleCampaignAnalyticsService {
  constructor(
    private readonly env: Env,
    private readonly http: HttpClient,
  ) {}

  fetchSnapshot(accountId: string): Promise<CampaignAnalyticsSnapshot> {
    const g = this.env.googleAdsApiUrl;
    if (g) {
      return this.http.get<CampaignAnalyticsSnapshot>(`${g}/accounts/${accountId}/google/snapshot`);
    }
    return this.http.get<CampaignAnalyticsSnapshot>(`/accounts/${accountId}/google/snapshot`);
  }
}

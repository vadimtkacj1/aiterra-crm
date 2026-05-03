import type { IAuthService } from "../auth/IAuthService";
import type { IAccountService } from "../accounts/IAccountService";
import type { IBillingService } from "../billing/IBillingService";
import type { IGoogleCampaignAnalyticsService } from "../analytics/google/IGoogleCampaignAnalyticsService";
import type { IMetaCampaignAnalyticsService } from "../analytics/meta/IMetaCampaignAnalyticsService";
import type { AdminService } from "../admin/AdminService";

export interface AppServices {
  auth: IAuthService;
  accounts: IAccountService;
  admin: AdminService;
  metaAnalytics: IMetaCampaignAnalyticsService;
  googleAnalytics: IGoogleCampaignAnalyticsService;
  billing: IBillingService;
}

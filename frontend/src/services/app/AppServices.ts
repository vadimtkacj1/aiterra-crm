import type { IAuthService } from "@/services/auth/IAuthService";
import type { IAccountService } from "@/services/accounts/IAccountService";
import type { IBillingService } from "@/services/billing/IBillingService";
import type { IGoogleCampaignAnalyticsService } from "@/services/analytics/google/IGoogleCampaignAnalyticsService";
import type { IMetaCampaignAnalyticsService } from "@/services/analytics/meta/IMetaCampaignAnalyticsService";
import type { AdminService } from "@/services/admin/AdminService";
import type { ISiteService } from "@/services/site/ISiteService";

export interface AppServices {
  auth: IAuthService;
  accounts: IAccountService;
  admin: AdminService;
  metaAnalytics: IMetaCampaignAnalyticsService;
  googleAnalytics: IGoogleCampaignAnalyticsService;
  billing: IBillingService;
  site: ISiteService;
}

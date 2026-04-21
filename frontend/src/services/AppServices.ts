import type { IAuthService } from "./interfaces/IAuthService";
import type { IAccountService } from "./interfaces/IAccountService";
import type { IBillingService } from "./interfaces/IBillingService";
import type { IGoogleCampaignAnalyticsService } from "./interfaces/IGoogleCampaignAnalyticsService";
import type { IMetaCampaignAnalyticsService } from "./interfaces/IMetaCampaignAnalyticsService";
import type { AdminService } from "./AdminService";

/** Корневой контейнер сервисов приложения (композиция зависимостей). */
export interface AppServices {
  auth: IAuthService;
  accounts: IAccountService;
  admin: AdminService;
  metaAnalytics: IMetaCampaignAnalyticsService;
  googleAnalytics: IGoogleCampaignAnalyticsService;
  billing: IBillingService;
}

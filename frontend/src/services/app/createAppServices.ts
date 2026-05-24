import type { Env } from "@/config/Env";
import { HttpClient } from "@/infrastructure/HttpClient";
import type { AppServices } from "./AppServices";
import { AccountService } from "@/services/accounts/AccountService";
import { AdminService } from "@/services/admin/AdminService";
import { AuthService } from "@/services/auth/AuthService";
import { BillingService } from "@/services/billing/BillingService";
import { SiteService } from "@/services/site/SiteService";
import { GoogleCampaignAnalyticsService } from "@/services/analytics/google/GoogleCampaignAnalyticsService";
import { MetaCampaignAnalyticsService } from "@/services/analytics/meta/MetaCampaignAnalyticsService";

export function createAppServices(env: Env): AppServices {
  let auth!: AuthService;

  const onUnauthorized = () => {
    auth.logout();
    window.location.replace("/login");
  };

  const http = new HttpClient(env, () => auth.getSession()?.accessToken ?? null, onUnauthorized);
  auth = new AuthService(env, http);

  return {
    auth,
    accounts: new AccountService(http),
    admin: new AdminService(http),
    metaAnalytics: new MetaCampaignAnalyticsService(env, http),
    googleAnalytics: new GoogleCampaignAnalyticsService(env, http),
    billing: new BillingService(env, http),
    site: new SiteService(http),
  };
}

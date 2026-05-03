import type { Env } from "../../config/Env";
import { HttpClient } from "../../infrastructure/HttpClient";
import type { AppServices } from "./AppServices";
import { AccountService } from "../accounts/AccountService";
import { AdminService } from "../admin/AdminService";
import { AuthService } from "../auth/AuthService";
import { BillingService } from "../billing/BillingService";
import { GoogleCampaignAnalyticsService } from "../analytics/google/GoogleCampaignAnalyticsService";
import { MetaCampaignAnalyticsService } from "../analytics/meta/MetaCampaignAnalyticsService";

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
  };
}

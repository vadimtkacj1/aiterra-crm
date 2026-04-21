import type { Env } from "../config/Env";
import { HttpClient } from "../infrastructure/HttpClient";
import type { AppServices } from "./AppServices";
import { AccountService } from "./AccountService";
import { AdminService } from "./AdminService";
import { AuthService } from "./AuthService";
import { BillingService } from "./BillingService";
import { GoogleCampaignAnalyticsService } from "./GoogleCampaignAnalyticsService";
import { MetaCampaignAnalyticsService } from "./MetaCampaignAnalyticsService";

/**
 * Фабрика сервисов: HttpClient читает токен из того же экземпляра AuthService.
 * При получении 401 от сервера токен удаляется и браузер перенаправляется на /login.
 */
export function createAppServices(env: Env): AppServices {
  let auth!: AuthService;

  const onUnauthorized = () => {
    auth.logout();
    // Hard redirect so React state is fully reset.
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

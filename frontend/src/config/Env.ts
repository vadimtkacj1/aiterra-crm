/**
 * App configuration from Vite env vars (VITE_*).
 */
export class Env {
  readonly appName: string;
  readonly apiBaseUrl: string;
  readonly metaAdsApiUrl: string;
  readonly metaAppId: string;
  readonly googleAdsApiUrl: string;
  readonly billingApiUrl: string;
  readonly authTokenKey: string;

  constructor() {
    const e = import.meta.env;
    this.appName = e.VITE_APP_NAME ?? "CRM";
    this.apiBaseUrl = (e.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
    this.metaAdsApiUrl = (e.VITE_META_ADS_API_URL ?? "").replace(/\/$/, "");
    this.metaAppId = (e.VITE_META_APP_ID ?? "").trim();
    this.googleAdsApiUrl = (e.VITE_GOOGLE_ADS_API_URL ?? "").replace(/\/$/, "");
    this.billingApiUrl = (e.VITE_BILLING_API_URL ?? "").replace(/\/$/, "");
    this.authTokenKey = e.VITE_AUTH_TOKEN_KEY ?? "crm_auth_token";
  }
}

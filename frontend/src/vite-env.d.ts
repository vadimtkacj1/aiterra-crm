/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_META_ADS_API_URL: string;
  readonly VITE_META_APP_ID: string;
  readonly VITE_GOOGLE_ADS_API_URL: string;
  readonly VITE_BILLING_API_URL: string;
  readonly VITE_AUTH_TOKEN_KEY: string;
  readonly VITE_DEV_PORT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

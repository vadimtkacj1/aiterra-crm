from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:///./app.db"

    jwt_secret: str = "change_me_in_prod"
    jwt_issuer: str = "crm-api"
    jwt_expires_hours: int = 72

    seed_admin_email: str = "admin@example.com"
    seed_admin_password: str = "Admin123!"

    # Comma-separated override: CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://[::1]:5173"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        parts = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        return parts or ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Meta Marketing API (optional).
    meta_app_id: str | None = None
    meta_seed_access_token: str | None = None
    meta_seed_ad_account_id: str | None = None
    meta_snapshot_mock: bool = False
    google_snapshot_mock: bool = True

    # Meta analytics: cache preset snapshot data once per UTC day per ad account (Graph quota / latency).
    meta_analytics_cache_enabled: bool = True
    meta_analytics_cache_cron_enabled: bool = True
    meta_analytics_cache_cron_hour_utc: int = 3
    meta_analytics_cache_cron_minute_utc: int = 0

    # Base URL for this server — used to build mock payment links in dev mode.
    # Override in production: APP_BASE_URL=https://api.yourdomain.com
    app_base_url: str = "http://localhost:8000"

    # Z-Credit — WebCheckout (hosted page) + Gateway (token charge)
    # Docs: https://zcreditwc.docs.apiary.io/  |  https://zcreditws.docs.apiary.io/
    zcredit_terminal_number: str | None = None   # ZCREDIT_TERMINAL_NUMBER (Gateway API)
    zcredit_api_key: str | None = None           # ZCREDIT_API_KEY = Web Checkout "Key"
    zcredit_gateway_password: str | None = None  # ZCREDIT_GATEWAY_PASSWORD (defaults to api key)
    zcredit_api_url: str = "https://pci.zcredit.co.il/webcheckout/api/WebCheckout"
    zcredit_gateway_base_url: str = "https://pci.zcredit.co.il/ZCreditWS/api"
    # Browser redirects after checkout (HTTPS in prod). Falls back to first CORS origin.
    zcredit_customer_app_url: str | None = None  # ZCREDIT_CUSTOMER_APP_URL
    zcredit_checkout_local: str = "En"  # He | En | Ru
    zcredit_webhook_secret: str | None = None    # optional shared secret (see webhook route)


settings = Settings()

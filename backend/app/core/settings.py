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

    # Base URL for this server — used to build mock payment links in dev mode.
    # Override in production: APP_BASE_URL=https://api.yourdomain.com
    app_base_url: str = "http://localhost:8000"

    # Z-Credit payment processing
    # Obtain credentials from Z-Credit after merchant account approval:
    #   https://www.z-credit.com/site/  |  info@z-credit.com  |  077-32-33-190
    zcredit_terminal_number: str | None = None   # ZCREDIT_TERMINAL_NUMBER env var
    zcredit_api_key: str | None = None           # ZCREDIT_API_KEY env var
    zcredit_api_url: str = "https://pci.zcredit.co.il/webcontrol"  # base URL (update after receiving docs)
    zcredit_webhook_secret: str | None = None    # ZCREDIT_WEBHOOK_SECRET env var


settings = Settings()

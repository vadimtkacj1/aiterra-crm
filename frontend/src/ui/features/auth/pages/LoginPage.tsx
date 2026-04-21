import { Card, Grid, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import logoUrl from "../../../../assets/logo-black.svg";
import { Paths } from "../../../navigation/paths";
import { LanguageSwitcher } from "../../../shared/components/LanguageSwitcher";
import { LoginForm } from "../components/LoginForm";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? Paths.accounts;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? 16 : 24,
        position: "relative",
        background: "#ffffff",
      }}
    >
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 1 }}>
        <LanguageSwitcher />
      </div>

      <Card
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 12,
          border: "1px solid rgba(15, 23, 42, 0.06)",
          boxShadow: "0 16px 48px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)",
        }}
        styles={{ body: { padding: isMobile ? 22 : 28 } }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <img
            src={logoUrl}
            alt={t("layout.brand")}
            width={isMobile ? 76 : 92}
            height={isMobile ? 76 : 92}
            style={{ display: "block" }}
          />
        </div>
        <Typography.Title
          level={isMobile ? 4 : 3}
          style={{ textAlign: "center", marginBottom: 22, fontWeight: 600 }}
        >
          {t("login.title")}
        </Typography.Title>

        <LoginForm isMobile={isMobile} onSuccess={() => navigate(from, { replace: true })} />

        <Typography.Paragraph type="secondary" style={{ textAlign: "center", marginBottom: 0, fontSize: 12 }}>
          {t("login.hint")}
        </Typography.Paragraph>
      </Card>
    </div>
  );
}

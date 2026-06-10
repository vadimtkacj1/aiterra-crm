import { GlobalOutlined } from "@ant-design/icons";
import { Card, Grid, Select, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import logoUrl from "@/assets/logo-black.svg";
import { defaultLanguage } from "@/i18n";
import { Paths } from "@/ui/navigation/paths";
import { brand } from "@/ui/theme/tokens";
import { LoginForm } from "../components/LoginForm";

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? Paths.accounts;
  const currentLang = i18n.language.startsWith("he") ? "he" : "en";

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
        background: "linear-gradient(145deg, #ece9fd 0%, #f8f7ff 45%, #f0eeff 100%)", // brand gradient
      }}
    >
      {/* Language switcher — fixed so it's always visible regardless of scroll */}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 200,
          background: "#ffffff",
          borderRadius: 8,
          boxShadow: `0 2px 8px ${brand.primaryShadowLg}`,
          padding: "2px",
        }}
      >
        <Select
          value={currentLang}
          style={{ minWidth: 130 }}
          variant="borderless"
          suffixIcon={<GlobalOutlined style={{ color: brand.primary }} />}
          aria-label={t("common.language")}
          options={[
            { value: "en", label: t("common.english") },
            { value: "he", label: t("common.hebrew") },
          ]}
          onChange={(lng: string) => void i18n.changeLanguage(lng ?? defaultLanguage)}
        />
      </div>

      <Card
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 16,
          border: `1px solid ${brand.primaryBorder}`,
          boxShadow: `0 24px 64px ${brand.primaryShadowMd}, 0 4px 16px ${brand.primaryShadowSm}`,
          background: "#ffffff",
        }}
        styles={{ body: { padding: isMobile ? 24 : 36 } }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <img
            src={logoUrl}
            alt={t("layout.brand")}
            width={isMobile ? 72 : 88}
            height={isMobile ? 72 : 88}
            style={{ display: "block" }}
          />
        </div>

        <Typography.Title
          level={isMobile ? 4 : 3}
          style={{ textAlign: "center", marginBottom: 6, fontWeight: 700, color: brand.dark }}
        >
          {t("login.title")}
        </Typography.Title>

        <Typography.Paragraph
          style={{ textAlign: "center", marginBottom: 28, color: brand.textSecondary, fontSize: 14, margin: "0 0 28px" }}
        >
          {t("login.hint")}
        </Typography.Paragraph>

        <LoginForm isMobile={isMobile} onSuccess={() => navigate(from, { replace: true })} />
      </Card>
    </div>
  );
}

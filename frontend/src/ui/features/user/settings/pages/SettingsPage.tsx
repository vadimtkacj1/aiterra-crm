import { GlobalOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Card, Flex, theme, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useApp } from "../../../../../app/AppProviders";
import { LanguageSwitcher } from "../../../../shared/components/LanguageSwitcher";
import { PageHeader } from "../../../../shared/components/PageHeader";
import { UserContentLayout } from "../../../../shared/components/UserContentLayout";
import { ChangePasswordForm } from "../components/ChangePasswordForm";

export function SettingsPage() {
  const { t } = useTranslation();
  const { session } = useApp();
  const { token } = theme.useToken();

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 400,
    boxShadow: "var(--ds-shadow-card)",
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: Math.max(12, token.borderRadiusLG * 1.25),
  };

  return (
    <UserContentLayout maxWidth={640} align="start">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <Flex vertical gap={20} style={{ width: "100%" }}>
        {/* Profile card */}
        {session?.user && (
          <Card
            variant="borderless"
            style={cardStyle}
            title={
              <span>
                <UserOutlined style={{ marginInlineEnd: 8 }} />
                {t("settings.profileSectionTitle")}
              </span>
            }
          >
            <Flex vertical gap={8}>
              <Flex align="center" gap={8}>
                <UserOutlined style={{ color: token.colorTextSecondary, width: 16 }} />
                <Typography.Text>
                  {session.user.displayName || t("settings.noDisplayName")}
                </Typography.Text>
              </Flex>
              <Flex align="center" gap={8}>
                <MailOutlined style={{ color: token.colorTextSecondary, width: 16 }} />
                <Typography.Text type="secondary">{session.user.email}</Typography.Text>
              </Flex>
            </Flex>
          </Card>
        )}

        {/* Language card */}
        <Card
          variant="borderless"
          style={cardStyle}
          title={
            <span>
              <GlobalOutlined style={{ marginInlineEnd: 8 }} />
              {t("settings.languageSectionTitle")}
            </span>
          }
        >
          <LanguageSwitcher />
        </Card>

        {/* Password card */}
        <ChangePasswordForm />
      </Flex>
    </UserContentLayout>
  );
}

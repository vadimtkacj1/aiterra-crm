import { MailOutlined, UserOutlined } from "@ant-design/icons";
import { Card, Flex, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useApp } from "../../../../../app/AppProviders";
import { LanguageSwitcher } from "../../../../shared/components/LanguageSwitcher";
import { PageHeader } from "../../../../shared/components/PageHeader";
import { UserContentLayout } from "../../../../shared/components/UserContentLayout";
import { ChangePasswordForm } from "../components/ChangePasswordForm";

export function SettingsPage() {
  const { t } = useTranslation();
  const { session } = useApp();

  return (
    <UserContentLayout maxWidth={640} align="start">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <Flex vertical gap={24} style={{ width: "100%" }}>
        {/* Profile card */}
        {session?.user && (
          <Card title={t("settings.profileSectionTitle")} style={{ width: "100%" }}>
            <Flex vertical gap={8}>
              <Flex align="center" gap={8}>
                <UserOutlined style={{ color: "var(--ds-text-tertiary)", width: 16 }} />
                <Typography.Text>
                  {session.user.displayName || t("settings.noDisplayName")}
                </Typography.Text>
              </Flex>
              <Flex align="center" gap={8}>
                <MailOutlined style={{ color: "var(--ds-text-tertiary)", width: 16 }} />
                <Typography.Text type="secondary">{session.user.email}</Typography.Text>
              </Flex>
            </Flex>
          </Card>
        )}

        {/* Language card */}
        <Card title={t("settings.languageSectionTitle")} style={{ width: "100%" }}>
          <LanguageSwitcher />
        </Card>

        {/* Password card */}
        <ChangePasswordForm />
      </Flex>
    </UserContentLayout>
  );
}

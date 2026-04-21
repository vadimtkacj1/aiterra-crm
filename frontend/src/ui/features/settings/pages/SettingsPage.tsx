import { useTranslation } from "react-i18next";
import { PageHeader } from "../../../shared/components/PageHeader";
import { UserContentLayout } from "../../../shared/components/UserContentLayout";
import { ChangePasswordForm } from "../components/ChangePasswordForm";

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <UserContentLayout maxWidth={640} align="start">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <ChangePasswordForm />
    </UserContentLayout>
  );
}

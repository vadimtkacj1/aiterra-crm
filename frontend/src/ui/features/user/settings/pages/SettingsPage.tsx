import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      <div className="flex w-full flex-col gap-6">
        {/* Profile card */}
        {session?.user && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>{t("settings.profileSectionTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="m-0 flex flex-col gap-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-(--ds-letter-spacing-caps) text-muted-foreground">
                    {t("settings.profileNameLabel")}
                  </dt>
                  <dd className="m-0 mt-1 text-sm">
                    {session.user.displayName || t("settings.noDisplayName")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-(--ds-letter-spacing-caps) text-muted-foreground">
                    {t("settings.profileEmailLabel")}
                  </dt>
                  <dd className="m-0 mt-1 text-sm">{session.user.email}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Language card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{t("settings.languageSectionTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <LanguageSwitcher />
          </CardContent>
        </Card>

        {/* Password card */}
        <ChangePasswordForm />
      </div>
    </UserContentLayout>
  );
}

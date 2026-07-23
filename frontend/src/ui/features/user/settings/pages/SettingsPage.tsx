import { Mail, User } from "lucide-react";
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
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <User className="size-4 shrink-0" style={{ color: "var(--ds-text-tertiary)" }} />
                  <span className="text-sm">
                    {session.user.displayName || t("settings.noDisplayName")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="size-4 shrink-0" style={{ color: "var(--ds-text-tertiary)" }} />
                  <span className="text-sm text-muted-foreground">{session.user.email}</span>
                </div>
              </div>
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

import { Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { message } from "@/lib/toast";
import { TranslatableError } from "../../../../../domain/errors";
import { useApp } from "../../../../../app/AppProviders";
import { useUnsavedChangesWarning } from "../../../../shared/hooks/useUnsavedChangesWarning";

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function ChangePasswordForm() {
  const { t } = useTranslation();
  const { services } = useApp();
  const form = useForm<PasswordForm>({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const [submitting, setSubmitting] = useState(false);
  const isDirty = form.formState.isDirty;

  useUnsavedChangesWarning(isDirty, {
    title: t("settings.unsavedTitle"),
    content: t("settings.unsavedContent"),
    okText: t("settings.unsavedLeave"),
    cancelText: t("settings.unsavedStay"),
  });

  const onFinish = async (values: PasswordForm) => {
    setSubmitting(true);
    try {
      await services.auth.changeOwnPassword(values.currentPassword, values.newPassword);
      message.success(t("settings.passwordSuccess"));
      form.reset();
    } catch (e) {
      if (e instanceof TranslatableError) {
        message.error(t(e.i18nKey));
      } else {
        message.error(e instanceof Error ? e.message : t("errors.generic"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t("settings.passwordSectionTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form form={form} onFinish={(v) => void onFinish(v)}>
          <FormItem<PasswordForm, "currentPassword">
            name="currentPassword"
            label={t("settings.currentPassword")}
            rules={{ required: t("settings.currentPasswordRequired") }}
          >
            {(field) => <Input {...field} type="password" autoComplete="current-password" />}
          </FormItem>
          <FormItem<PasswordForm, "newPassword">
            name="newPassword"
            label={t("settings.newPassword")}
            rules={{
              required: t("settings.newPasswordRequired"),
              minLength: { value: 8, message: t("settings.passwordMinLength") },
              deps: ["confirmPassword"],
            }}
          >
            {(field) => <Input {...field} type="password" autoComplete="new-password" />}
          </FormItem>
          <FormItem<PasswordForm, "confirmPassword">
            name="confirmPassword"
            label={t("settings.confirmPassword")}
            rules={{
              required: t("settings.confirmPasswordRequired"),
              validate: (value, values) =>
                !value || values.newPassword === value || t("settings.passwordMismatch"),
            }}
          >
            {(field) => <Input {...field} type="password" autoComplete="new-password" />}
          </FormItem>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Spinner size="sm" className="text-current" /> : <Save />}
            {t("settings.savePassword")}
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
}

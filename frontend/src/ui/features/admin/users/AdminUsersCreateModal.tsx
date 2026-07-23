import { Plug, RefreshCw, UserPlus } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { TFunction } from "i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Form, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AppModal } from "@/ui/shared/components/AppModal";
import type { MetaCampaignOption } from "@/services/analytics/meta/IMetaCampaignAnalyticsService";
import type { AdminCreateUserFormValues, AdminUserLinkFormValues } from "./adminUsersTypes";
import { AdminUsersGoogleLinkFields } from "./AdminUsersGoogleLinkFields";
import { AdminUsersMetaLinkFields } from "./AdminUsersMetaLinkFields";
import { AdminUsersSiteLinkFields } from "./AdminUsersSiteLinkFields";

type Props = {
  t: TFunction;
  open: boolean;
  form: UseFormReturn<AdminCreateUserFormValues>;
  metaCampaigns: MetaCampaignOption[];
  metaCampaignsLoading: boolean;
  /** Emails already in the system — used for inline duplicate validation. */
  existingEmails?: string[];
  onFinish: (values: AdminCreateUserFormValues) => Promise<void>;
  onCancel: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Crypto-random password: 12 chars, unambiguous alphabet (no 0/O/1/l/I). */
function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function AdminUsersCreateModal({
  t, open, form, metaCampaigns, metaCampaignsLoading, existingEmails = [], onFinish, onCancel,
}: Props) {
  /* The shared link-field components are typed against the common subset of
     both the create and edit forms — structurally safe cast. */
  const linkForm = form as unknown as UseFormReturn<AdminUserLinkFormValues>;

  const handleOk = () =>
    form.handleSubmit(async (values) => {
      await onFinish(values);
    })();

  const emailSet = new Set(existingEmails.map((e) => e.trim().toLowerCase()));

  const fillGeneratedPassword = () => {
    form.setValue("password", generatePassword(), {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const roleOption = (value: string, title: string, desc: string) => (
    <label className="flex cursor-pointer items-start gap-2">
      <RadioGroupItem value={value} className="mt-0.5" />
      <span className="inline-flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{desc}</span>
      </span>
    </label>
  );

  return (
    <AppModal
      title={
        <span className="inline-flex items-center gap-2">
          <UserPlus className="size-4" />
          {t("admin.form.createTitle")}
        </span>
      }
      open={open}
      onCancel={onCancel}
      okText={t("admin.form.submit")}
      onOk={() => void handleOk()}
    >
      <Form form={form} className="mt-2">
        <FormItem<AdminCreateUserFormValues, "email">
          name="email"
          label={t("admin.form.email")}
          rules={{
            required: t("form.validation.emailRequired"),
            pattern: { value: EMAIL_RE, message: t("form.validation.emailInvalid") },
            validate: (value) =>
              !value || !emailSet.has(value.trim().toLowerCase()) || t("admin.form.emailTaken"),
          }}
        >
          {(field) => <Input {...field} type="email" dir="ltr" autoFocus />}
        </FormItem>

        <FormItem<AdminCreateUserFormValues, "password">
          name="password"
          label={t("admin.form.password")}
          hint={t("admin.form.passwordHint")}
          rules={{
            required: t("admin.form.passwordHint"),
            minLength: { value: 8, message: t("admin.form.passwordHint") },
          }}
          className="mb-5"
        >
          {(field) => (
            <div className="flex gap-2">
              <Input {...field} type="password" autoComplete="new-password" dir="ltr" className="flex-1" />
              <Button type="button" variant="outline" onClick={fillGeneratedPassword}>
                <RefreshCw />
                {t("admin.form.generatePassword")}
              </Button>
            </div>
          )}
        </FormItem>

        <FormItem<AdminCreateUserFormValues, "displayName">
          name="displayName"
          label={t("admin.form.displayName")}
          rules={{ required: t("form.validation.required") }}
        >
          {(field) => <Input {...field} />}
        </FormItem>
        <FormItem<AdminCreateUserFormValues, "phone"> name="phone" label={t("admin.form.phone")}>
          {(field) => <Input {...field} value={field.value ?? ""} placeholder="+972-50-000-0000" dir="ltr" />}
        </FormItem>

        {/* Role — two radio cards with consequences spelled out (always has a value) */}
        <FormItem<AdminCreateUserFormValues, "role"> name="role" label={t("admin.form.role")}>
          {(field) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
              {roleOption("user", t("admin.roles.user"), t("admin.roles.userDesc"))}
              {roleOption("admin", t("admin.roles.admin"), t("admin.roles.adminDesc"))}
            </RadioGroup>
          )}
        </FormItem>

        <Accordion type="single" collapsible className="mt-1">
          <AccordionItem value="integrations" className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline">
              <span className="inline-flex items-center gap-1.5 font-normal">
                <Plug className="size-4" />
                <span>{t("admin.form.integrationsSection")}</span>
                <span className="text-xs text-muted-foreground">
                  — {t("admin.form.integrationsSectionHint")}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <AdminUsersMetaLinkFields
                t={t}
                form={linkForm}
                metaCampaigns={metaCampaigns}
                metaCampaignsLoading={metaCampaignsLoading}
                showLinkMetaExtra
              />
              <div style={{ borderTop: "1px solid var(--ds-border-subtle)", marginTop: "var(--ds-space-5)", paddingTop: "var(--ds-space-5)" }}>
                <AdminUsersGoogleLinkFields t={t} form={linkForm} mode="create" />
              </div>
              <div style={{ borderTop: "1px solid var(--ds-border-subtle)", marginTop: "var(--ds-space-5)", paddingTop: "var(--ds-space-5)" }}>
                <AdminUsersSiteLinkFields t={t} form={linkForm} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Form>
    </AppModal>
  );
}

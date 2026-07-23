import { useWatch, type UseFormReturn } from "react-hook-form";
import type { TFunction } from "i18next";
import { GoogleIcon } from "@/components/icons/brand";
import { FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { AdminUserLinkFormValues } from "./adminUsersTypes";

type Props = {
  t: TFunction;
  form: UseFormReturn<AdminUserLinkFormValues>;
  mode: "create" | "edit";
  /** When true (edit + existing Google creds), dev/refresh tokens are optional. */
  editGoogleHasCredentials?: boolean;
};

export function AdminUsersGoogleLinkFields({ t, form, mode, editGoogleHasCredentials }: Props) {
  const showExtra = mode === "create";
  const tokensOptional = mode === "edit" && Boolean(editGoogleHasCredentials);
  const linkGoogle = useWatch({ control: form.control, name: "linkGoogle" });

  return (
    <div className="space-y-5">
      {/* Toggle row — same pattern as the Site module switch. Stored value
          stays "with"/"without" so payloads and edit prefill are unchanged. */}
      <FormItem<AdminUserLinkFormValues, "linkGoogle">
        name="linkGoogle"
        label={
          <span className="inline-flex items-center gap-1.5">
            <GoogleIcon className="text-[#4285f4]" />
            {t("admin.form.linkGoogle")}
          </span>
        }
        hint={showExtra ? t("admin.form.linkGoogleExtra") : undefined}
      >
        {(field) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={field.value === "with"}
              onCheckedChange={(checked) => field.onChange(checked ? "with" : "without")}
            />
            <span className="text-sm text-muted-foreground">
              {field.value === "with" ? t("admin.form.linkGoogleWith") : t("admin.form.linkGoogleWithout")}
            </span>
          </div>
        )}
      </FormItem>

      {linkGoogle === "with" && (
        <>
          <FormItem<AdminUserLinkFormValues, "googleCustomerId">
            name="googleCustomerId"
            label={t("admin.form.googleCustomerId")}
            rules={{ required: t("admin.form.googleCustomerIdRequired") }}
            hint={showExtra ? t("admin.form.googleCustomerIdHint") : undefined}
          >
            {(field) => <Input {...field} value={field.value ?? ""} placeholder="1234567890" />}
          </FormItem>
          <FormItem<AdminUserLinkFormValues, "googleDeveloperToken">
            name="googleDeveloperToken"
            label={t("admin.form.googleDeveloperToken")}
            rules={tokensOptional ? undefined : { required: t("admin.form.googleDeveloperTokenRequired") }}
            hint={tokensOptional ? t("admin.form.googleTokensKeepHint") : undefined}
          >
            {(field) => <Input {...field} value={field.value ?? ""} type="password" autoComplete="new-password" />}
          </FormItem>
          <FormItem<AdminUserLinkFormValues, "googleRefreshToken">
            name="googleRefreshToken"
            label={t("admin.form.googleRefreshToken")}
            rules={tokensOptional ? undefined : { required: t("admin.form.googleRefreshTokenRequired") }}
          >
            {(field) => <Input {...field} value={field.value ?? ""} type="password" autoComplete="new-password" />}
          </FormItem>
          <FormItem<AdminUserLinkFormValues, "googleLoginCustomerId">
            name="googleLoginCustomerId"
            label={t("admin.form.googleLoginCustomerId")}
            hint={showExtra ? t("admin.form.googleLoginCustomerIdHint") : undefined}
          >
            {(field) => <Input {...field} value={field.value ?? ""} placeholder="1234567890" />}
          </FormItem>
        </>
      )}
    </div>
  );
}

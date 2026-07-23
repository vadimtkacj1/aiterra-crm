import { Globe, Link as LinkIcon, Mail } from "lucide-react";
import { useMemo } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import type { TFunction } from "i18next";
import { WhatsAppIcon } from "@/components/icons/brand";
import { FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { UserBusinessSite } from "@/services/admin/AdminService";
import { Env } from "@/config/Env";
import { SiteIntegrationCard } from "@/ui/features/user/site/components/SiteIntegrationCard";
import type { AdminUserLinkFormValues } from "./adminUsersTypes";
import { WaPhoneManager } from "./WaPhoneManager";

type Props = {
  t: TFunction;
  form: UseFormReturn<AdminUserLinkFormValues>;
  userId?: string;
  siteInfo?: UserBusinessSite | null;
  onTokenRegenerated?: (newToken: string) => void;
  regenerateToken?: (accountId: string) => Promise<{ publicToken: string | null }>;
  sendTestNotification?: (accountId: string, email: string) => Promise<void>;
};

export function AdminUsersSiteLinkFields({ t, form, userId, siteInfo, onTokenRegenerated, regenerateToken, sendTestNotification }: Props) {
  const apiBaseUrl = useMemo(() => new Env().apiBaseUrl, []);
  const linkSite = useWatch({ control: form.control, name: "linkSite" });
  const notifyChannel = useWatch({ control: form.control, name: "notifyChannel" });
  const ch = notifyChannel as string;

  return (
    <div className="space-y-5">
      <FormItem<AdminUserLinkFormValues, "linkSite">
        name="linkSite"
        label={
          <span className="inline-flex items-center gap-1.5">
            <Globe className="size-4" style={{ color: "var(--ds-color-primary)" }} />
            {t("admin.form.linkSite")}
          </span>
        }
      >
        {(field) => (
          <div className="flex items-center gap-2">
            <Switch checked={Boolean(field.value)} onCheckedChange={(checked) => field.onChange(checked)} />
            <span className="text-sm text-muted-foreground">
              {field.value ? t("admin.form.linkSiteWith") : t("admin.form.linkSiteWithout")}
            </span>
          </div>
        )}
      </FormItem>

      {linkSite ? (
        <>
          <FormItem<AdminUserLinkFormValues, "siteUrl">
            name="siteUrl"
            label={t("admin.form.siteUrl")}
            rules={{
              validate: (value) => {
                if (!value || !value.trim()) return true;
                try {
                  new URL(value);
                  return true;
                } catch {
                  return t("admin.form.siteUrlInvalid");
                }
              },
            }}
          >
            {(field) => (
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                  <LinkIcon className="size-4 text-muted-foreground" />
                </span>
                <Input {...field} value={field.value ?? ""} placeholder="https://example.com" className="ps-9" dir="ltr" />
              </div>
            )}
          </FormItem>

          {/* Notification channel */}
          <FormItem<AdminUserLinkFormValues, "notifyChannel"> name="notifyChannel" label={t("site.notify.channelLabel")}>
            {(field) => (
              <RadioGroup
                value={field.value ?? "whatsapp"}
                onValueChange={field.onChange}
                className="gap-2.5"
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="whatsapp" />
                  <span className="inline-flex items-center gap-1">
                    <WhatsAppIcon className="text-[#25d366]" />
                    WhatsApp
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="email" />
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-4" />
                    {t("site.notify.channelEmail")}
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="both" />
                  {t("site.notify.channelBoth")}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value="none" />
                  {t("site.notify.channelNone")}
                </label>
              </RadioGroup>
            )}
          </FormItem>

          {/* WhatsApp multi-phone manager */}
          {userId && (
            <div className="space-y-1.5">
              <Label>
                <span className="inline-flex items-center gap-1.5">
                  <WhatsAppIcon className="text-[#25d366]" />
                  {t("admin.whatsapp.phones.title")}
                </span>
              </Label>
              <WaPhoneManager userId={userId} />
            </div>
          )}

          {/* WhatsApp config fields */}
          {(ch === "whatsapp" || ch === "both") && (
            <FormItem<AdminUserLinkFormValues, "waNotifyMessage"> name="waNotifyMessage" label={t("site.whatsapp.message")}>
              {(field) => (
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder={t("site.whatsapp.messagePlaceholder")}
                  rows={2}
                />
              )}
            </FormItem>
          )}

          {/* Email config fields */}
          {(ch === "email" || ch === "both") && (
            <>
              <FormItem<AdminUserLinkFormValues, "emailNotifySubject"> name="emailNotifySubject" label={t("site.email.subject")}>
                {(field) => (
                  <Input {...field} value={field.value ?? ""} placeholder={t("site.email.subjectPlaceholder")} />
                )}
              </FormItem>
              <FormItem<AdminUserLinkFormValues, "emailNotifyMessage"> name="emailNotifyMessage" label={t("site.email.message")}>
                {(field) => (
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    placeholder={t("site.email.messagePlaceholder")}
                    rows={2}
                  />
                )}
              </FormItem>
            </>
          )}

          {siteInfo?.publicToken && siteInfo.accountId != null && regenerateToken && onTokenRegenerated && (
            <div className="mb-0 space-y-1.5">
              <Label>{t("site.integration.title")}</Label>
              <SiteIntegrationCard
                accountId={String(siteInfo.accountId)}
                publicToken={siteInfo.publicToken}
                apiBaseUrl={apiBaseUrl}
                onTokenRegenerated={onTokenRegenerated}
                regenerateToken={regenerateToken}
                sendTestNotification={sendTestNotification}
              />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

import { useWatch, type UseFormReturn } from "react-hook-form";
import type { TFunction } from "i18next";
import { FacebookIcon } from "@/components/icons/brand";
import { Combobox } from "@/components/ui/combobox";
import { FormItem } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import type { MetaCampaignOption } from "@/services/analytics/meta/IMetaCampaignAnalyticsService";
import type { AdminUserLinkFormValues } from "./adminUsersTypes";

type Props = {
  t: TFunction;
  form: UseFormReturn<AdminUserLinkFormValues>;
  metaCampaigns: MetaCampaignOption[];
  metaCampaignsLoading: boolean;
  showLinkMetaExtra?: boolean;
};

export function AdminUsersMetaLinkFields({ t, form, metaCampaigns, metaCampaignsLoading, showLinkMetaExtra }: Props) {
  const linkMeta = useWatch({ control: form.control, name: "linkMeta" });

  return (
    <div className="space-y-5">
      {/* Toggle row — same pattern as the Site module switch. The stored form
          value stays the legacy "with"/"without" string so submit payloads and
          the edit-modal prefill are unchanged; the Switch maps at the boundary. */}
      <FormItem<AdminUserLinkFormValues, "linkMeta">
        name="linkMeta"
        label={
          <span className="inline-flex items-center gap-1.5">
            <FacebookIcon className="text-[#1877f2]" />
            {t("admin.form.linkMeta")}
          </span>
        }
        hint={showLinkMetaExtra ? t("admin.form.linkMetaExtra") : undefined}
      >
        {(field) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={field.value === "with"}
              onCheckedChange={(checked) => field.onChange(checked ? "with" : "without")}
            />
            <span className="text-sm text-muted-foreground">
              {field.value === "with" ? t("admin.form.linkMetaWith") : t("admin.form.linkMetaWithout")}
            </span>
          </div>
        )}
      </FormItem>

      {linkMeta === "with" && (
        <FormItem<AdminUserLinkFormValues, "metaCampaignId">
          name="metaCampaignId"
          label={t("admin.form.metaCampaign")}
          rules={{ required: t("admin.form.metaCampaignRequired") }}
          hint={showLinkMetaExtra ? t("admin.form.metaCampaignHint") : undefined}
        >
          {(field) => (
            <Combobox
              options={metaCampaigns.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              value={field.value ?? null}
              onChange={(v) => field.onChange(v ?? undefined)}
              loading={metaCampaignsLoading}
              placeholder={t("admin.form.metaCampaignPlaceholder")}
              searchPlaceholder={t("common.search")}
              emptyText={t("common.noData")}
            />
          )}
        </FormItem>
      )}
    </div>
  );
}

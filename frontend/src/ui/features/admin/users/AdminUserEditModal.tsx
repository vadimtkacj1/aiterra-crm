import type { UseFormReturn } from "react-hook-form";
import type { TFunction } from "i18next";
import { Alert } from "@/components/ui/alert";
import { Form, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { AppModal } from "@/ui/shared/components/AppModal";
import type { UserBusinessMeta, UserBusinessSite } from "@/services/admin/AdminService";
import type { MetaCampaignOption } from "@/services/analytics/meta/IMetaCampaignAnalyticsService";
import type { AdminEditUserFormValues, AdminUserLinkFormValues } from "./adminUsersTypes";
import { AdminUsersGoogleLinkFields } from "./AdminUsersGoogleLinkFields";
import { AdminUsersMetaLinkFields } from "./AdminUsersMetaLinkFields";
import { AdminUsersSiteLinkFields } from "./AdminUsersSiteLinkFields";

type Props = {
  t: TFunction;
  open: boolean;
  editMetaLoading: boolean;
  editMetaInfo: UserBusinessMeta | null;
  editGoogleHasCredentials: boolean;
  editSiteInfo: UserBusinessSite | null;
  editUserId?: string;
  editForm: UseFormReturn<AdminEditUserFormValues>;
  metaCampaigns: MetaCampaignOption[];
  metaCampaignsLoading: boolean;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onSiteTokenRegenerated: (newToken: string) => void;
  regenerateSiteToken: (accountId: string) => Promise<{ publicToken: string | null }>;
  sendTestNotification: (accountId: string, email: string) => Promise<void>;
};

export function AdminUserEditModal({
  t,
  open,
  editMetaLoading,
  editMetaInfo,
  editGoogleHasCredentials,
  editSiteInfo,
  editUserId,
  editForm,
  metaCampaigns,
  metaCampaignsLoading,
  onCancel,
  onSave,
  onSiteTokenRegenerated,
  regenerateSiteToken,
  sendTestNotification,
}: Props) {
  const sectionStyle = { paddingTop: 20, borderTop: "1px solid var(--ds-border-subtle)" };
  /* The shared link-field components are typed against the common subset of
     both the create and edit forms — structurally safe cast. */
  const linkForm = editForm as unknown as UseFormReturn<AdminUserLinkFormValues>;

  return (
    <AppModal
      title={t("admin.editUserTitle")}
      open={open}
      onCancel={onCancel}
      okText={t("admin.save")}
      okButtonProps={{ disabled: editMetaLoading || editMetaInfo === null }}
      onOk={() => void onSave()}
    >
      <div className="relative">
        {editMetaLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Spinner />
          </div>
        )}
        <Form form={editForm} className="mt-2">
          <FormItem<AdminEditUserFormValues, "displayName">
            name="displayName"
            label={t("admin.form.displayName")}
            rules={{ required: t("form.validation.required") }}
          >
            {(field) => <Input {...field} />}
          </FormItem>
          <FormItem<AdminEditUserFormValues, "role">
            name="role"
            label={t("admin.form.role")}
            rules={{ required: t("form.validation.required") }}
          >
            {(field) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t("admin.roles.user")}</SelectItem>
                  <SelectItem value="admin">{t("admin.roles.admin")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </FormItem>
          {editMetaInfo && editMetaInfo.accountId == null ? (
            <Alert variant="info" title={t("admin.editNoBusiness")} className="mb-3" />
          ) : null}
          {editMetaInfo && editMetaInfo.accountId != null ? (
            <>
              <div style={sectionStyle}>
                <AdminUsersMetaLinkFields
                  t={t}
                  form={linkForm}
                  metaCampaigns={metaCampaigns}
                  metaCampaignsLoading={metaCampaignsLoading}
                />
              </div>
              <div style={sectionStyle}>
                <AdminUsersGoogleLinkFields
                  t={t}
                  form={linkForm}
                  mode="edit"
                  editGoogleHasCredentials={editGoogleHasCredentials}
                />
              </div>
              <div style={sectionStyle}>
                <AdminUsersSiteLinkFields
                  t={t}
                  form={linkForm}
                  userId={editUserId}
                  siteInfo={editSiteInfo}
                  onTokenRegenerated={onSiteTokenRegenerated}
                  regenerateToken={regenerateSiteToken}
                  sendTestNotification={sendTestNotification}
                />
              </div>
            </>
          ) : null}
        </Form>
      </div>
    </AppModal>
  );
}

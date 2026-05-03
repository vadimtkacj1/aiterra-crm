import { Alert, Form, Input, Modal, Select, Spin } from "antd";
import type { FormInstance } from "antd/es/form";
import type { TFunction } from "i18next";
import type { UserBusinessMeta } from "@/services/admin/AdminService";
import type { MetaCampaignOption } from "@/services/analytics/meta/IMetaCampaignAnalyticsService";
import type { AdminEditUserFormValues } from "./adminUsersTypes";
import { AdminUsersBillingFields } from "./AdminUsersBillingFields";
import { AdminUsersGoogleLinkFields } from "./AdminUsersGoogleLinkFields";
import { AdminUsersMetaLinkFields } from "./AdminUsersMetaLinkFields";

type Props = {
  t: TFunction;
  open: boolean;
  editMetaLoading: boolean;
  editMetaInfo: UserBusinessMeta | null;
  editGoogleHasCredentials: boolean;
  editForm: FormInstance<AdminEditUserFormValues>;
  metaCampaigns: MetaCampaignOption[];
  metaCampaignsLoading: boolean;
  onCancel: () => void;
  onSave: () => Promise<void>;
};

export function AdminUserEditModal({
  t,
  open,
  editMetaLoading,
  editMetaInfo,
  editGoogleHasCredentials,
  editForm,
  metaCampaigns,
  metaCampaignsLoading,
  onCancel,
  onSave,
}: Props) {
  return (
    <Modal
      title={t("admin.editUserTitle")}
      open={open}
      onCancel={onCancel}
      okText={t("admin.save")}
      okButtonProps={{ disabled: editMetaLoading || editMetaInfo === null }}
      onOk={() => void onSave()}
    >
      <Spin spinning={editMetaLoading}>
        <Form form={editForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="displayName" label={t("admin.form.displayName")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label={t("admin.form.role")} rules={[{ required: true }]}>
            <Select
              options={[
                { value: "user", label: t("admin.roles.user") },
                { value: "admin", label: t("admin.roles.admin") },
              ]}
            />
          </Form.Item>
          {editMetaInfo && editMetaInfo.accountId == null ? (
            <Alert type="info" showIcon message={t("admin.editNoBusiness")} style={{ marginBottom: 12 }} />
          ) : null}
          {editMetaInfo && editMetaInfo.accountId != null ? (
            <>
              <AdminUsersMetaLinkFields t={t} metaCampaigns={metaCampaigns} metaCampaignsLoading={metaCampaignsLoading} />
              <AdminUsersGoogleLinkFields
                t={t}
                mode="edit"
                editGoogleHasCredentials={editGoogleHasCredentials}
              />
              <AdminUsersBillingFields t={t} />
            </>
          ) : null}
        </Form>
      </Spin>
    </Modal>
  );
}

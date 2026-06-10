import { ApiOutlined, UserAddOutlined } from "@ant-design/icons";
import { Collapse, Form, Input, Select, Typography } from "antd";
import { AppModal } from "@/ui/shared/components/AppModal";
import type { FormInstance } from "antd/es/form";
import type { TFunction } from "i18next";
import type { MetaCampaignOption } from "@/services/analytics/meta/IMetaCampaignAnalyticsService";
import type { AdminCreateUserFormValues } from "./adminUsersTypes";
import { AdminUsersGoogleLinkFields } from "./AdminUsersGoogleLinkFields";
import { AdminUsersMetaLinkFields } from "./AdminUsersMetaLinkFields";
import { AdminUsersSiteLinkFields } from "./AdminUsersSiteLinkFields";

type Props = {
  t: TFunction;
  open: boolean;
  form: FormInstance<AdminCreateUserFormValues>;
  metaCampaigns: MetaCampaignOption[];
  metaCampaignsLoading: boolean;
  onFinish: (values: AdminCreateUserFormValues) => Promise<void>;
  onCancel: () => void;
};

export function AdminUsersCreateModal({ t, open, form, metaCampaigns, metaCampaignsLoading, onFinish, onCancel }: Props) {
  const handleOk = async () => {
    const values = await form.validateFields();
    await onFinish(values);
  };

  return (
    <AppModal
      title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><UserAddOutlined />{t("admin.form.createTitle")}</span>}
      open={open}
      onCancel={onCancel}
      okText={t("admin.form.submit")}
      onOk={handleOk}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ role: "user", linkMeta: "without", linkGoogle: "without", linkSite: false }}
        style={{ marginTop: 8 }}
      >
        <Form.Item name="email" label={t("admin.form.email")} rules={[{ required: true, type: "email" }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="password"
          label={t("admin.form.password")}
          rules={[{ required: true, min: 8, message: t("errors.validation") }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item name="displayName" label={t("admin.form.displayName")} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="phone" label={t("admin.form.phone")}>
          <Input placeholder="+972-50-000-0000" />
        </Form.Item>
        <Form.Item name="role" label={t("admin.form.role")} rules={[{ required: true }]}>
          <Select
            options={[
              { value: "user", label: t("admin.roles.user") },
              { value: "admin", label: t("admin.roles.admin") },
            ]}
          />
        </Form.Item>

        <Collapse
          ghost
          style={{ marginTop: 4 }}
          items={[
            {
              key: "integrations",
              label: (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <ApiOutlined />
                  <Typography.Text>{t("admin.form.integrationsSection")}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    — {t("admin.form.integrationsSectionHint")}
                  </Typography.Text>
                </span>
              ),
              children: (
                <>
                  <AdminUsersMetaLinkFields
                    t={t}
                    metaCampaigns={metaCampaigns}
                    metaCampaignsLoading={metaCampaignsLoading}
                    showLinkMetaExtra
                  />
                  <AdminUsersGoogleLinkFields t={t} mode="create" />
                  <AdminUsersSiteLinkFields t={t} />
                </>
              ),
            },
          ]}
        />
      </Form>
    </AppModal>
  );
}

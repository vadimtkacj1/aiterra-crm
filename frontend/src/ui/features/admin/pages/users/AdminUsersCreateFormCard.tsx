import { UserAddOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Select } from "antd";
import type { FormInstance } from "antd/es/form";
import type { TFunction } from "i18next";
import type { MetaCampaignOption } from "@/services/analytics/meta/IMetaCampaignAnalyticsService";
import type { AdminCreateUserFormValues } from "./adminUsersTypes";
import { AdminUsersGoogleLinkFields } from "./AdminUsersGoogleLinkFields";
import { AdminUsersMetaLinkFields } from "./AdminUsersMetaLinkFields";

type Props = {
  t: TFunction;
  form: FormInstance<AdminCreateUserFormValues>;
  metaCampaigns: MetaCampaignOption[];
  metaCampaignsLoading: boolean;
  onFinish: (values: AdminCreateUserFormValues) => Promise<void>;
};

export function AdminUsersCreateFormCard({ t, form, metaCampaigns, metaCampaignsLoading, onFinish }: Props) {
  return (
    <Card title={<span><UserAddOutlined style={{ marginRight: 8 }} />{t("admin.form.createTitle")}</span>}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ role: "user", linkMeta: "without", linkGoogle: "without" }}
        onFinish={(values) => void onFinish(values)}
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
        <Form.Item name="role" label={t("admin.form.role")} rules={[{ required: true }]}>
          <Select
            options={[
              { value: "user", label: t("admin.roles.user") },
              { value: "admin", label: t("admin.roles.admin") },
            ]}
          />
        </Form.Item>
        <AdminUsersMetaLinkFields
          t={t}
          metaCampaigns={metaCampaigns}
          metaCampaignsLoading={metaCampaignsLoading}
          showLinkMetaExtra
        />
        <AdminUsersGoogleLinkFields t={t} mode="create" />
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<UserAddOutlined />}>
            {t("admin.form.submit")}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

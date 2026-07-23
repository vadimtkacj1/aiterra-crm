import { ApiOutlined, ReloadOutlined, UserAddOutlined } from "@ant-design/icons";
import { Button, Collapse, Form, Input, Radio, Space, Typography } from "antd";
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
  /** Emails already in the system — used for inline duplicate validation. */
  existingEmails?: string[];
  onFinish: (values: AdminCreateUserFormValues) => Promise<void>;
  onCancel: () => void;
};

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
  const handleOk = async () => {
    const values = await form.validateFields();
    await onFinish(values);
  };

  const emailSet = new Set(existingEmails.map((e) => e.trim().toLowerCase()));

  const fillGeneratedPassword = () => {
    form.setFieldsValue({ password: generatePassword() } as Partial<AdminCreateUserFormValues>);
    void form.validateFields(["password"]);
  };

  const roleOption = (value: string, title: string, desc: string) => (
    <Radio value={value}>
      <span style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
        <Typography.Text strong>{title}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{desc}</Typography.Text>
      </span>
    </Radio>
  );

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
        <Form.Item
          name="email"
          label={t("admin.form.email")}
          validateFirst
          rules={[
            { required: true, type: "email" },
            {
              validator: async (_, value: string) => {
                if (value && emailSet.has(value.trim().toLowerCase())) {
                  throw new Error(t("admin.form.emailTaken"));
                }
              },
            },
          ]}
        >
          <Input autoFocus />
        </Form.Item>

        <Form.Item label={t("admin.form.password")} extra={t("admin.form.passwordHint")} required style={{ marginBottom: 20 }}>
          <Space.Compact block>
            <Form.Item name="password" noStyle rules={[{ required: true, min: 8, message: t("admin.form.passwordHint") }]}>
              <Input.Password />
            </Form.Item>
            <Button icon={<ReloadOutlined />} onClick={fillGeneratedPassword}>
              {t("admin.form.generatePassword")}
            </Button>
          </Space.Compact>
        </Form.Item>

        <Form.Item name="displayName" label={t("admin.form.displayName")} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="phone" label={t("admin.form.phone")}>
          <Input placeholder="+972-50-000-0000" />
        </Form.Item>

        {/* Role — two radio cards with consequences spelled out (always has a value) */}
        <Form.Item name="role" label={t("admin.form.role")}>
          <Radio.Group>
            <Space direction="vertical" size={12}>
              {roleOption("user", t("admin.roles.user"), t("admin.roles.userDesc"))}
              {roleOption("admin", t("admin.roles.admin"), t("admin.roles.adminDesc"))}
            </Space>
          </Radio.Group>
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
                  <div style={{ borderTop: "1px solid var(--ds-border-subtle)", marginTop: "var(--ds-space-5)", paddingTop: "var(--ds-space-5)" }}>
                    <AdminUsersGoogleLinkFields t={t} mode="create" />
                  </div>
                  <div style={{ borderTop: "1px solid var(--ds-border-subtle)", marginTop: "var(--ds-space-5)", paddingTop: "var(--ds-space-5)" }}>
                    <AdminUsersSiteLinkFields t={t} />
                  </div>
                </>
              ),
            },
          ]}
        />
      </Form>
    </AppModal>
  );
}

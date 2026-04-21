import { LockOutlined, SaveOutlined } from "@ant-design/icons";
import { App, Button, Card, Form, Input, theme } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslatableError } from "../../../../domain/errors";
import { useApp } from "../../../../app/AppProviders";

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function ChangePasswordForm() {
  const { t } = useTranslation();
  const { services } = useApp();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm<PasswordForm>();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: PasswordForm) => {
    setSubmitting(true);
    try {
      await services.auth.changeOwnPassword(values.currentPassword, values.newPassword);
      void message.success(t("settings.passwordSuccess"));
      form.resetFields();
    } catch (e) {
      if (e instanceof TranslatableError) {
        void message.error(t(e.i18nKey));
      } else {
        void message.error(e instanceof Error ? e.message : t("errors.generic"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      variant="borderless"
      style={{
        maxWidth: 400,
        width: "100%",
        boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: Math.max(12, token.borderRadiusLG * 1.25),
      }}
      title={
        <span>
          <LockOutlined style={{ marginRight: 8 }} />
          {t("settings.passwordSectionTitle")}
        </span>
      }
    >
      <Form form={form} layout="vertical" onFinish={(v) => void onFinish(v)} requiredMark="optional">
        <Form.Item
          name="currentPassword"
          label={t("settings.currentPassword")}
          rules={[{ required: true, message: t("settings.currentPasswordRequired") }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label={t("settings.newPassword")}
          rules={[
            { required: true, message: t("settings.newPasswordRequired") },
            { min: 8, message: t("settings.passwordMinLength") },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label={t("settings.confirmPassword")}
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: t("settings.confirmPasswordRequired") },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t("settings.passwordMismatch")));
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting} size="large">
            {t("settings.savePassword")}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

import { SaveOutlined } from "@ant-design/icons";
import { App, Button, Card, Form, Input } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslatableError } from "../../../../../domain/errors";
import { useApp } from "../../../../../app/AppProviders";
import { useUnsavedChangesWarning } from "../../../../shared/hooks/useUnsavedChangesWarning";

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function ChangePasswordForm() {
  const { t } = useTranslation();
  const { services } = useApp();
  const { message } = App.useApp();
  const [form] = Form.useForm<PasswordForm>();
  const [submitting, setSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useUnsavedChangesWarning(isDirty, {
    title: t("settings.unsavedTitle"),
    content: t("settings.unsavedContent"),
    okText: t("settings.unsavedLeave"),
    cancelText: t("settings.unsavedStay"),
  });

  const onFinish = async (values: PasswordForm) => {
    setSubmitting(true);
    try {
      await services.auth.changeOwnPassword(values.currentPassword, values.newPassword);
      void message.success(t("settings.passwordSuccess"));
      setIsDirty(false);
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
    <Card style={{ width: "100%" }} title={t("settings.passwordSectionTitle")}>
      <Form form={form} layout="vertical" onFinish={(v) => void onFinish(v)} requiredMark="optional" onValuesChange={() => setIsDirty(true)}>
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
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
            {t("settings.savePassword")}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

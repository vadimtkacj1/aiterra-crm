import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { App as AntApp, Button, Form, Input } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslatableError } from "../../../../domain/errors";
import { useApp } from "../../../../app/AppProviders";

interface Props {
  onSuccess: () => void;
  isMobile: boolean;
}

export function LoginForm({ onSuccess, isMobile }: Props) {
  const { login } = useApp();
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const [submitting, setSubmitting] = useState(false);

  return (
    <Form
      layout="vertical"
      onFinish={async (values: { email: string; password: string }) => {
        setSubmitting(true);
        try {
          await login(values);
          onSuccess();
        } catch (e) {
          if (e instanceof TranslatableError) {
            message.error(t(e.i18nKey));
          } else {
            message.error(e instanceof Error ? e.message : t("errors.generic"));
          }
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <Form.Item
        name="email"
        label={t("login.email")}
        rules={[{ required: true, type: "email", message: t("errors.validation") }]}
      >
        <Input prefix={<UserOutlined />} placeholder={t("login.emailPlaceholder")} size="large" />
      </Form.Item>
      <Form.Item
        name="password"
        label={t("login.password")}
        rules={[{ required: true, message: t("errors.validation") }]}
      >
        <Input.Password prefix={<LockOutlined />} size="large" />
      </Form.Item>
      <Form.Item style={{ marginBottom: isMobile ? 8 : 12 }}>
        <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
          {t("login.submit")}
        </Button>
      </Form.Item>
    </Form>
  );
}

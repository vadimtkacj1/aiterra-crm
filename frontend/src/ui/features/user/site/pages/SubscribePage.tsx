import { CheckCircleOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { Button, Form, Input, Result, Spin, Typography } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

const { Title, Text } = Typography;

interface FormValues {
  name: string;
  phone: string;
  email?: string;
  message?: string;
}

async function submitLead(token: string, values: FormValues): Promise<void> {
  const res = await fetch("/api/site-leads/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicToken: token,
      name: values.name,
      phone: values.phone,
      email: values.email || undefined,
      message: values.message || undefined,
      source: window.location.href,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail ?? "error");
  }
}

export function SubscribePage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish(values: FormValues) {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitLead(token, values);
      setDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      setError(msg === "invalid_token" ? t("subscribe.errorInvalidToken") : t("subscribe.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={wrapStyle}>
        <Result
          icon={<CheckCircleOutlined style={{ color: "var(--ds-color-success)" }} />}
          title={t("subscribe.successTitle")}
          subTitle={t("subscribe.successSubtitle")}
        />
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <Spin spinning={submitting}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <WhatsAppOutlined style={{ fontSize: 36, color: "#25d366", marginBottom: 8 }} />
            <Title level={3} style={{ margin: 0 }}>{t("subscribe.title")}</Title>
            <Text type="secondary">{t("subscribe.subtitle")}</Text>
          </div>

          {error && (
            <div style={{ color: "var(--ds-color-error)", marginBottom: 16, textAlign: "center" }}>
              {error}
            </div>
          )}

          <Form form={form} layout="vertical" onFinish={(v) => void handleFinish(v)}>
            <Form.Item
              name="name"
              label={t("subscribe.fieldName")}
              rules={[{ required: true, message: t("subscribe.fieldNameRequired") }]}
            >
              <Input placeholder={t("subscribe.fieldNamePlaceholder")} size="large" />
            </Form.Item>

            <Form.Item
              name="phone"
              label={t("subscribe.fieldPhone")}
              rules={[{ required: true, message: t("subscribe.fieldPhoneRequired") }]}
            >
              <Input placeholder="+972501234567" size="large" type="tel" />
            </Form.Item>

            <Form.Item
              name="email"
              label={t("subscribe.fieldEmail")}
              rules={[{ type: "email", message: t("subscribe.fieldEmailInvalid") }]}
            >
              <Input placeholder={t("subscribe.fieldEmailPlaceholder")} size="large" type="email" />
            </Form.Item>

            <Form.Item name="message" label={t("subscribe.fieldMessage")}>
              <Input.TextArea
                placeholder={t("subscribe.fieldMessagePlaceholder")}
                rows={3}
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
                {t("subscribe.submitBtn")}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Spin>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--ds-surface-2)",
  padding: 16,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: "32px 28px",
  width: "100%",
  maxWidth: 420,
  boxShadow: "0 2px 16px rgba(0,0,0,0.09)",
};

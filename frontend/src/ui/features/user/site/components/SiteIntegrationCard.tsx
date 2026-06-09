import { CodeOutlined, CopyOutlined, LinkOutlined, ReloadOutlined, SendOutlined } from "@ant-design/icons";
import { App, Button, Card, Input, Popconfirm, Space, Tag, Typography } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const { Text, Paragraph } = Typography;

interface Props {
  accountId: string;
  publicToken: string | null;
  apiBaseUrl: string;
  onTokenRegenerated: (newToken: string) => void;
  regenerateToken: (accountId: string) => Promise<{ publicToken: string | null }>;
  sendTestNotification?: (accountId: string, email: string) => Promise<void>;
}

export function SiteIntegrationCard({ accountId, publicToken, apiBaseUrl, onTokenRegenerated, regenerateToken, sendTestNotification }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [regenerating, setRegenerating] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);

  const endpoint = `${apiBaseUrl}/site-leads/submit`;
  const token = publicToken ?? "…";

  const snippet = `fetch("${endpoint}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    publicToken: "${token}",
    name: "John Doe",           // required
    phone: "+972501234567",     // optional
    email: "john@example.com",  // optional
    message: "Hello!",          // optional
    source: window.location.href, // tracks which page sent the lead
  }),
});`;

  function copyToClipboard(text: string, key: string) {
    void navigator.clipboard.writeText(text).then(() => {
      void message.success(t(`site.integration.copied.${key}`));
    });
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const config = await regenerateToken(accountId);
      if (config.publicToken) {
        onTokenRegenerated(config.publicToken);
        void message.success(t("site.integration.regenerated"));
      }
    } catch {
      void message.error(t("site.integration.regenerateError"));
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSendTest() {
    if (!sendTestNotification || !testEmail) return;
    setTestSending(true);
    try {
      await sendTestNotification(accountId, testEmail);
      void message.success(t("site.integration.testSent"));
    } catch {
      void message.error(t("site.integration.testError"));
    } finally {
      setTestSending(false);
    }
  }

  return (
    <Card
      title={
        <>
          <CodeOutlined style={{ marginRight: 8 }} />
          {t("site.integration.title")}
        </>
      }
    >
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <div>
          <Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
            {t("site.integration.tokenLabel")}
          </Text>
          <Space wrap>
            <Tag color="blue" style={{ fontSize: 13, padding: "2px 10px", fontFamily: "monospace" }}>
              {token}
            </Tag>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(token, "token")}
            >
              {t("site.integration.copy")}
            </Button>
            <Popconfirm
              title={t("site.integration.regenerateConfirm")}
              onConfirm={() => void handleRegenerate()}
              okText={t("site.integration.regenerateOk")}
              cancelText={t("site.integration.regenerateCancel")}
            >
              <Button size="small" icon={<ReloadOutlined />} loading={regenerating} danger>
                {t("site.integration.regenerateBtn")}
              </Button>
            </Popconfirm>
          </Space>
          <Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 12 }}>
            {t("site.integration.tokenHint")}
          </Text>
        </div>

        <div>
          <Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
            {t("site.integration.endpointLabel")}
          </Text>
          <Space>
            <Tag icon={<LinkOutlined />} style={{ fontSize: 12, padding: "2px 8px" }}>
              POST {endpoint}
            </Tag>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(endpoint, "endpoint")}
            >
              {t("site.integration.copy")}
            </Button>
          </Space>
        </div>

        <div>
          <Space style={{ marginBottom: 6 }}>
            <Text type="secondary">{t("site.integration.snippetLabel")}</Text>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(snippet, "snippet")}
            >
              {t("site.integration.copy")}
            </Button>
          </Space>
          <Paragraph
            style={{
              background: "#1a1a2e",
              color: "#a8dadc",
              padding: "12px 16px",
              borderRadius: 6,
              fontFamily: "monospace",
              fontSize: 12,
              whiteSpace: "pre",
              overflowX: "auto",
              margin: 0,
            }}
          >
            {snippet}
          </Paragraph>
        </div>

        {sendTestNotification && (
          <div>
            <Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
              {t("site.integration.testLabel")}
            </Text>
            <Space>
              <Input
                size="small"
                placeholder="email@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                style={{ width: 220 }}
              />
              <Button
                size="small"
                icon={<SendOutlined />}
                loading={testSending}
                disabled={!testEmail}
                onClick={() => void handleSendTest()}
              >
                {t("site.integration.testBtn")}
              </Button>
            </Space>
          </div>
        )}
      </Space>
    </Card>
  );
}

import { CodeOutlined, CopyOutlined, LinkOutlined } from "@ant-design/icons";
import { App, Button, Card, Space, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";

const { Text, Paragraph } = Typography;

interface Props {
  accountId: string;
  apiBaseUrl: string;
}

export function SiteIntegrationCard({ accountId, apiBaseUrl }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const endpoint = `${apiBaseUrl}/api/site-leads/submit`;

  const snippet = `fetch("${endpoint}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    accountId: ${accountId},
    name: "John Doe",          // required
    phone: "+972501234567",    // optional
    email: "john@example.com", // optional
    message: "Hello!",         // optional
    source: window.location.href, // tracks which page sent the lead
  }),
});`;

  function copyToClipboard(text: string, key: string) {
    void navigator.clipboard.writeText(text).then(() => {
      void message.success(t(`site.integration.copied.${key}`));
    });
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
            {t("site.integration.accountIdLabel")}
          </Text>
          <Space>
            <Tag color="blue" style={{ fontSize: 14, padding: "2px 10px" }}>
              {accountId}
            </Tag>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(accountId, "id")}
            >
              {t("site.integration.copy")}
            </Button>
          </Space>
          <Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 12 }}>
            {t("site.integration.accountIdHint")}
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
      </Space>
    </Card>
  );
}

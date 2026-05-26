import { GlobalOutlined } from "@ant-design/icons";
import { App, Card, Col, Row, Typography } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useApp } from "../../../../../app/AppProviders";
import type { SiteConfig } from "../../../../../domain/Site";
import { PageHeader } from "../../../../shared/components/PageHeader";
import { UserContentLayout } from "../../../../shared/components/UserContentLayout";

const { Text, Link } = Typography;

export function SitePage() {
  const { t } = useTranslation();
  const { services } = useApp();
  const { message } = App.useApp();
  const { accountId } = useParams<{ accountId: string }>();
  const messageRef = useRef(message);
  messageRef.current = message;

  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const data = await services.site.getConfig(accountId ?? "0");
      setConfig(data);
    } catch {
      messageRef.current.error(t("site.loadError"));
    } finally {
      setConfigLoading(false);
    }
  }, [services, accountId, t]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  return (
    <UserContentLayout maxWidth={900} align="start">
      <PageHeader title={t("site.title")} subtitle={t("site.subtitle")} />

      <Row gutter={[0, 24]} style={{ width: "100%" }}>
        <Col span={24}>
          <Card
            title={
              <>
                <GlobalOutlined style={{ marginRight: 8 }} />
                {t("site.links.title")}
              </>
            }
            loading={configLoading}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                  {t("site.links.siteUrl")}
                </Text>
                {config?.siteUrl ? (
                  <Link href={config.siteUrl} target="_blank">{config.siteUrl}</Link>
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </div>
              <div>
                <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                  {t("site.links.gmbUrl")}
                </Text>
                {config?.gmbUrl ? (
                  <Link href={config.gmbUrl} target="_blank">{config.gmbUrl}</Link>
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </UserContentLayout>
  );
}

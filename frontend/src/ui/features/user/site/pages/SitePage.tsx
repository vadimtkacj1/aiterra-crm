import { GlobalOutlined, ReloadOutlined, TeamOutlined } from "@ant-design/icons";
import { App, Button, Card, Col, Row, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useApp } from "../../../../../app/AppProviders";
import type { SiteConfig, SiteLead } from "../../../../../domain/Site";
import { AppTable } from "../../../../shared/components/AppTable";
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
  const [leads, setLeads] = useState<SiteLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

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

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const data = await services.site.listLeads(accountId ?? "0");
      setLeads(data);
    } catch {
      messageRef.current.error(t("site.leads.loadError"));
    } finally {
      setLeadsLoading(false);
    }
  }, [services, accountId, t]);

  useEffect(() => {
    void loadConfig();
    void loadLeads();
  }, [loadConfig, loadLeads]);

  const leadsColumns: ColumnsType<SiteLead> = [
    {
      title: t("site.leads.colName"),
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      width: 150,
    },
    {
      title: t("site.leads.colPhone"),
      dataIndex: "phone",
      key: "phone",
      render: (v: string | null) => v ?? "—",
      width: 130,
    },
    {
      title: t("site.leads.colEmail"),
      dataIndex: "email",
      key: "email",
      render: (v: string | null) => v ?? "—",
      ellipsis: true,
      width: 180,
    },
    {
      title: t("site.leads.colMessage"),
      dataIndex: "message",
      key: "message",
      render: (v: string | null) => v ?? "—",
      ellipsis: true,
    },
    {
      title: t("site.leads.colTreatment"),
      dataIndex: "treatment",
      key: "treatment",
      width: 160,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: t("site.leads.colSource"),
      dataIndex: "source",
      key: "source",
      ellipsis: true,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v}>
            <Link href={v} target="_blank" ellipsis style={{ maxWidth: 200 }}>
              {v}
            </Link>
          </Tooltip>
        ) : (
          "—"
        ),
      width: 200,
    },
    {
      title: t("site.leads.colDate"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => new Date(v).toLocaleString(),
      width: 155,
    },
  ];

  return (
    <UserContentLayout maxWidth={960} align="start">
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

        <Col span={24}>
          <Card
            title={
              <>
                <TeamOutlined style={{ marginRight: 8 }} />
                {t("site.leads.title")}
                <Text type="secondary" style={{ fontWeight: 400, marginLeft: 8 }}>
                  ({leads.length})
                </Text>
              </>
            }
            extra={
              <Button
                icon={<ReloadOutlined />}
                size="small"
                loading={leadsLoading}
                onClick={() => void loadLeads()}
              >
                {t("site.leads.refresh")}
              </Button>
            }
          >
            <AppTable<SiteLead>
              loading={leadsLoading}
              dataSource={leads}
              columns={leadsColumns}
              locale={{ emptyText: t("site.leads.empty") }}
            />
          </Card>
        </Col>
      </Row>
    </UserContentLayout>
  );
}

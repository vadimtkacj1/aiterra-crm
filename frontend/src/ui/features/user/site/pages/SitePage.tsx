import {
  CopyOutlined,
  GlobalOutlined,
  LinkOutlined,
  MailOutlined,
  NotificationOutlined,
  ReloadOutlined,
  SaveOutlined,
  TeamOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { App, Button, Card, Col, Input, Radio, Row, Space, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useApp } from "../../../../../app/AppProviders";
import type { SiteConfig, SiteLead } from "../../../../../domain/Site";
import { AppTable } from "../../../../shared/components/AppTable";
import { PageHeader } from "../../../../shared/components/PageHeader";
import { UserContentLayout } from "../../../../shared/components/UserContentLayout";
import { SiteIntegrationCard } from "../components/SiteIntegrationCard";

const { Text, Link } = Typography;

export function SitePage() {
  const { t } = useTranslation();
  const { services } = useApp();
  const { message } = App.useApp();
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined ?? "").replace(/\/$/, "");
  const { accountId } = useParams<{ accountId: string }>();
  const messageRef = useRef(message);
  messageRef.current = message;

  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [leads, setLeads] = useState<SiteLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

  // Notification config form state
  const [notifyChannel, setNotifyChannel] = useState("whatsapp");
  const [waNotifyMessage, setWaNotifyMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [waSaving, setWaSaving] = useState(false);
  const [waConnectCode, setWaConnectCode] = useState("");
  const [waConnectBotPhone, setWaConnectBotPhone] = useState("");
  const [waConnecting, setWaConnecting] = useState(false);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const data = await services.site.getConfig(accountId ?? "0");
      setConfig(data);
      setNotifyChannel(data.notifyChannel ?? "whatsapp");
      setWaConnectCode(data.waConnectCode ?? "");
      setWaConnectBotPhone(data.waBotPhone ?? "");
      setWaNotifyMessage(data.waNotifyMessage ?? "");
      setEmailSubject(data.emailNotifySubject ?? "");
      setEmailMessage(data.emailNotifyMessage ?? "");
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

  async function saveNotifyConfig() {
    setWaSaving(true);
    try {
      const updated = await services.site.updateConfig(accountId ?? "0", {
        notifyChannel: notifyChannel || "whatsapp",
        waNotifyMessage: waNotifyMessage || null,
        emailNotifySubject: emailSubject || null,
        emailNotifyMessage: emailMessage || null,
      });
      setConfig(updated);
      void messageRef.current.success(t("site.notify.saved"));
    } catch {
      void messageRef.current.error(t("site.saveError"));
    } finally {
      setWaSaving(false);
    }
  }

  const subscribeUrl = config?.publicToken
    ? `${window.location.origin}/s/${config.publicToken}`
    : null;

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      void messageRef.current.success(t("site.subscribe.copied"));
    });
  }

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
        {/* Subscription link */}
        <Col span={24}>
          <Card
            title={
              <>
                <LinkOutlined style={{ marginRight: 8 }} />
                {t("site.subscribe.title")}
              </>
            }
            loading={configLoading}
          >
            <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
              {t("site.subscribe.hint")}
            </Text>
            {subscribeUrl ? (
              <Space wrap>
                <Tag
                  color="green"
                  style={{ fontSize: 13, padding: "4px 12px", fontFamily: "monospace", maxWidth: 500, overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {subscribeUrl}
                </Tag>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(subscribeUrl)}
                >
                  {t("site.subscribe.copy")}
                </Button>
                <Button
                  size="small"
                  icon={<GlobalOutlined />}
                  href={subscribeUrl}
                  target="_blank"
                >
                  {t("site.subscribe.open")}
                </Button>
              </Space>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Card>
        </Col>

        {/* Site links */}
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

        {/* Notification config */}
        <Col span={24}>
          <Card
            title={
              <>
                <NotificationOutlined style={{ marginRight: 8 }} />
                {t("site.notify.title")}
              </>
            }
            loading={configLoading}
          >
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
              {t("site.notify.hint")}
            </Text>

            {/* Channel selector */}
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                {t("site.notify.channelLabel")}
              </Text>
              <Radio.Group value={notifyChannel} onChange={(e) => setNotifyChannel(e.target.value as string)}>
                <Radio value="whatsapp">
                  <WhatsAppOutlined style={{ color: "#25d366", marginRight: 4 }} />
                  WhatsApp
                </Radio>
                <Radio value="email">
                  <MailOutlined style={{ marginRight: 4 }} />
                  {t("site.notify.channelEmail")}
                </Radio>
                <Radio value="both">{t("site.notify.channelBoth")}</Radio>
                <Radio value="none">{t("site.notify.channelNone")}</Radio>
              </Radio.Group>
            </div>

            {/* WhatsApp message template */}
            {(notifyChannel === "whatsapp" || notifyChannel === "both") && (
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24}>
                  <Text strong style={{ display: "block", marginBottom: 8, color: "#25d366" }}>
                    <WhatsAppOutlined style={{ marginRight: 6 }} />
                    {t("site.whatsapp.title")}
                  </Text>
                </Col>
                <Col xs={24}>
                  {(config?.waOwnerPhoneVerified || config?.waOwnerPhone) ? (
                    /* ── Connected state ── */
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 8 }}>
                      <WhatsAppOutlined style={{ color: "#52c41a", fontSize: 20 }} />
                      <div>
                        <Text strong style={{ color: "#52c41a" }}>✓ {t("site.whatsapp.connected")}</Text>
                        <Text type="secondary" style={{ display: "block", fontSize: 12 }}>{config.waOwnerPhoneVerified ?? config.waOwnerPhone}</Text>
                      </div>
                      <Button
                        size="small"
                        style={{ marginLeft: "auto" }}
                        loading={waConnecting}
                        icon={<ReloadOutlined />}
                        onClick={async () => {
                          setWaConnecting(true);
                          try {
                            const status = await services.site.waConnectStatus(accountId ?? "0");
                            if (status.verified) await loadConfig();
                          } finally {
                            setWaConnecting(false);
                          }
                        }}
                      >
                        {t("site.whatsapp.refresh")}
                      </Button>
                    </div>
                  ) : (
                    /* ── Not connected — show permanent code ── */
                    <div style={{ padding: "14px 16px", background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 8 }}>
                      <Text strong style={{ display: "block", marginBottom: 6 }}>
                        <WhatsAppOutlined style={{ color: "#25d366", marginRight: 6 }} />
                        {t("site.whatsapp.connectInstructions")}
                      </Text>
                      {waConnectBotPhone && (
                        <div style={{ marginBottom: 6 }}>
                          <Text type="secondary">{t("site.whatsapp.connectSendTo")} </Text>
                          <Text strong copyable>{waConnectBotPhone}</Text>
                        </div>
                      )}
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>{t("site.whatsapp.connectSendMessage")}</Text>
                        <Text
                          strong
                          copyable
                          style={{ fontSize: 22, letterSpacing: 3, fontFamily: "monospace", color: "#1677ff" }}
                        >
                          {waConnectCode || "…"}
                        </Text>
                      </div>
                      <Button
                        type="primary"
                        loading={waConnecting}
                        icon={<ReloadOutlined />}
                        onClick={async () => {
                          setWaConnecting(true);
                          try {
                            const status = await services.site.waConnectStatus(accountId ?? "0");
                            if (status.verified && status.phone) {
                              await loadConfig();
                              void messageRef.current.success(t("site.whatsapp.connectSuccess"));
                            } else {
                              void messageRef.current.info(t("site.whatsapp.connectNotYet"));
                            }
                          } finally {
                            setWaConnecting(false);
                          }
                        }}
                      >
                        {t("site.whatsapp.connectCheck")}
                      </Button>
                    </div>
                  )}
                </Col>
                <Col xs={24}>
                  <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                    {t("site.whatsapp.message")}
                  </Text>
                  <Input.TextArea
                    value={waNotifyMessage}
                    onChange={(e) => setWaNotifyMessage(e.target.value)}
                    placeholder={t("site.whatsapp.messagePlaceholder")}
                    rows={2}
                  />
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
                    {t("site.whatsapp.messageHint")}
                  </Text>
                </Col>
              </Row>
            )}

            {/* Email fields */}
            {(notifyChannel === "email" || notifyChannel === "both") && (
              <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24}>
                  <Text strong style={{ display: "block", marginBottom: 8 }}>
                    <MailOutlined style={{ marginRight: 6 }} />
                    {t("site.email.title")}
                  </Text>
                </Col>
                <Col xs={24}>
                  <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                    {t("site.email.subject")}
                  </Text>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder={t("site.email.subjectPlaceholder")}
                  />
                </Col>
                <Col xs={24}>
                  <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                    {t("site.email.message")}
                  </Text>
                  <Input.TextArea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder={t("site.email.messagePlaceholder")}
                    rows={2}
                  />
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
                    {t("site.email.messageHint")}
                  </Text>
                </Col>
              </Row>
            )}

            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={waSaving}
              onClick={() => void saveNotifyConfig()}
            >
              {t("site.notify.save")}
            </Button>
          </Card>
        </Col>

        {/* Integration card */}
        {config?.publicToken && (
          <Col span={24}>
            <SiteIntegrationCard
              accountId={accountId ?? "0"}
              publicToken={config.publicToken}
              apiBaseUrl={apiBaseUrl}
              onTokenRegenerated={(newToken) => setConfig((c) => c ? { ...c, publicToken: newToken } : c)}
              regenerateToken={(id) => services.site.regenerateToken(id)}
            />
          </Col>
        )}

        {/* Leads table */}
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

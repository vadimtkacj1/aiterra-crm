import { Copy, Globe, Mail, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useApp } from "../../../../../app/AppProviders";
import type { SiteConfig, SiteLead } from "../../../../../domain/Site";
import { WhatsAppIcon } from "@/components/icons/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { message } from "@/lib/toast";
import { EmptyState } from "../../../../shared/components/EmptyState";
import { PageHeader } from "../../../../shared/components/PageHeader";
import { UserContentLayout } from "../../../../shared/components/UserContentLayout";

function CardBodySkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function SitePage() {
  const { t } = useTranslation();
  const { services } = useApp();
  const { accountId } = useParams<{ accountId: string }>();

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
      message.error(t("site.loadError"));
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
      message.error(t("site.leads.loadError"));
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
      message.success(t("site.notify.saved"));
    } catch {
      message.error(t("site.saveError"));
    } finally {
      setWaSaving(false);
    }
  }

  const subscribeUrl = config?.publicToken
    ? `${window.location.origin}/s/${config.publicToken}`
    : null;

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      message.success(t("site.subscribe.copied"));
    });
  }

  const leadsColumns: DataTableColumn<SiteLead>[] = [
    {
      title: t("site.leads.colName"),
      dataIndex: "name",
      key: "name",
      width: 150,
      onCell: () => ({ style: { maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }),
    },
    {
      title: t("site.leads.colPhone"),
      dataIndex: "phone",
      key: "phone",
      render: (v) => (v as string | null) ?? "—",
      width: 130,
    },
    {
      title: t("site.leads.colEmail"),
      dataIndex: "email",
      key: "email",
      render: (v) => (v as string | null) ?? "—",
      width: 180,
      onCell: () => ({ style: { maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }),
    },
    {
      title: t("site.leads.colMessage"),
      dataIndex: "message",
      key: "message",
      render: (v) => (v as string | null) ?? "—",
      onCell: () => ({ style: { maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }),
    },
    {
      title: t("site.leads.colTreatment"),
      dataIndex: "treatment",
      key: "treatment",
      width: 160,
      render: (v) => (v as string | null) ?? "—",
    },
    {
      title: t("site.leads.colSource"),
      dataIndex: "source",
      key: "source",
      width: 200,
      render: (v) => {
        const src = v as string | null;
        return src ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="block max-w-[200px] truncate text-primary hover:underline"
                >
                  {src}
                </a>
              </TooltipTrigger>
              <TooltipContent>{src}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          "—"
        );
      },
    },
    {
      title: t("site.leads.colDate"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v) => <span className="tabular-nums">{new Date(v as string).toLocaleString()}</span>,
      width: 155,
    },
  ];

  return (
    <UserContentLayout maxWidth={960} align="start">
      <PageHeader title={t("site.title")} subtitle={t("site.subtitle")} />

      <div className="grid w-full gap-6">
        {/* Subscription link */}
        <Card>
          <CardHeader>
            <CardTitle>{t("site.subscribe.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <CardBodySkeleton />
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">{t("site.subscribe.hint")}</p>
                {subscribeUrl ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      dir="ltr"
                      className="inline-block max-w-[500px] overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border px-3 py-1"
                      style={{
                        fontFamily: "var(--ds-font-family-mono)",
                        fontSize: 13,
                        background: "var(--ds-surface-1)",
                        borderColor: "var(--ds-border-subtle)",
                        color: "var(--ds-text-secondary)",
                      }}
                    >
                      {subscribeUrl}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(subscribeUrl)}>
                      <Copy />
                      {t("site.subscribe.copy")}
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={subscribeUrl} target="_blank" rel="noreferrer">
                        <Globe />
                        {t("site.subscribe.open")}
                      </a>
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Notification config */}
        <Card>
          <CardHeader>
            <CardTitle>{t("site.notify.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <CardBodySkeleton />
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">{t("site.notify.hint")}</p>

                {/* Channel selector */}
                <div className="mb-5">
                  <span className="mb-2 block text-sm font-semibold">{t("site.notify.channelLabel")}</span>
                  <RadioGroup
                    value={notifyChannel}
                    onValueChange={(v) => setNotifyChannel(v)}
                    className="flex flex-wrap items-center gap-x-6 gap-y-2"
                  >
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <RadioGroupItem value="whatsapp" />
                      <WhatsAppIcon className="text-[#25d366]" />
                      WhatsApp
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <RadioGroupItem value="email" />
                      <Mail className="size-4" />
                      {t("site.notify.channelEmail")}
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <RadioGroupItem value="both" />
                      {t("site.notify.channelBoth")}
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <RadioGroupItem value="none" />
                      {t("site.notify.channelNone")}
                    </label>
                  </RadioGroup>
                </div>

                {/* WhatsApp message template */}
                {(notifyChannel === "whatsapp" || notifyChannel === "both") && (
                  <div className="mb-4 grid gap-4">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <WhatsAppIcon className="text-[#25d366]" />
                      {t("site.whatsapp.title")}
                    </span>
                    {config?.waOwnerPhoneVerified || config?.waOwnerPhone ? (
                      /* ── Connected state ── */
                      <div className="flex flex-wrap items-center gap-3">
                        <WhatsAppIcon className="size-5" style={{ color: "var(--ds-color-success)" }} />
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{t("site.whatsapp.connected")}</span>
                          <span
                            className="block text-xs tabular-nums text-muted-foreground"
                            style={{ direction: "ltr", unicodeBidi: "isolate", textAlign: "start" }}
                          >
                            {config.waOwnerPhoneVerified ?? config.waOwnerPhone}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={waConnecting}
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
                          {waConnecting ? <Spinner size="sm" className="text-current" /> : <RefreshCw />}
                          {t("site.whatsapp.refresh")}
                        </Button>
                      </div>
                    ) : (
                      /* ── Not connected — show permanent code ── */
                      <div>
                        <span className="mb-1.5 block text-sm font-semibold">
                          {t("site.whatsapp.connectInstructions")}
                        </span>
                        {waConnectBotPhone && (
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <span className="text-sm text-muted-foreground">
                              {t("site.whatsapp.connectSendTo")}{" "}
                            </span>
                            <span
                              className="inline-block text-sm font-semibold tabular-nums"
                              style={{ direction: "ltr", unicodeBidi: "isolate" }}
                            >
                              {waConnectBotPhone}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              aria-label={t("site.subscribe.copy")}
                              onClick={() => copyToClipboard(waConnectBotPhone)}
                            >
                              <Copy className="size-3.5" />
                            </Button>
                          </div>
                        )}
                        <div className="mb-3">
                          <span className="mb-1 block text-sm text-muted-foreground">
                            {t("site.whatsapp.connectSendMessage")}
                          </span>
                          <span className="flex items-center gap-2">
                            <span
                              className="font-semibold"
                              style={{
                                fontSize: 22,
                                letterSpacing: 3,
                                fontFamily: "var(--ds-font-family-mono)",
                                color: "var(--ds-color-primary)",
                              }}
                            >
                              {waConnectCode || "…"}
                            </span>
                            {waConnectCode && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6"
                                aria-label={t("site.subscribe.copy")}
                                onClick={() => copyToClipboard(waConnectCode)}
                              >
                                <Copy className="size-3.5" />
                              </Button>
                            )}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          disabled={waConnecting}
                          onClick={async () => {
                            setWaConnecting(true);
                            try {
                              const status = await services.site.waConnectStatus(accountId ?? "0");
                              if (status.verified && status.phone) {
                                await loadConfig();
                                message.success(t("site.whatsapp.connectSuccess"));
                              } else {
                                message.info(t("site.whatsapp.connectNotYet"));
                              }
                            } finally {
                              setWaConnecting(false);
                            }
                          }}
                        >
                          {waConnecting ? <Spinner size="sm" className="text-current" /> : <RefreshCw />}
                          {t("site.whatsapp.connectCheck")}
                        </Button>
                      </div>
                    )}
                    <div>
                      <span className="mb-1 block text-sm text-muted-foreground">
                        {t("site.whatsapp.message")}
                      </span>
                      <Textarea
                        value={waNotifyMessage}
                        onChange={(e) => setWaNotifyMessage(e.target.value)}
                        placeholder={t("site.whatsapp.messagePlaceholder")}
                        rows={2}
                        className="min-h-0"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">{t("site.whatsapp.messageHint")}</p>
                    </div>
                  </div>
                )}

                {/* Email fields */}
                {(notifyChannel === "email" || notifyChannel === "both") && (
                  <div className="mb-4 grid gap-4">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <Mail className="size-4" />
                      {t("site.email.title")}
                    </span>
                    <div>
                      <span className="mb-1 block text-sm text-muted-foreground">{t("site.email.subject")}</span>
                      <Input
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder={t("site.email.subjectPlaceholder")}
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-sm text-muted-foreground">{t("site.email.message")}</span>
                      <Textarea
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder={t("site.email.messagePlaceholder")}
                        rows={2}
                        className="min-h-0"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">{t("site.email.messageHint")}</p>
                    </div>
                  </div>
                )}

                <Button disabled={waSaving} onClick={() => void saveNotifyConfig()}>
                  {waSaving ? <Spinner size="sm" className="text-current" /> : <Save />}
                  {t("site.notify.save")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Leads table */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>
              {t("site.leads.title")}
              <span className="ms-2 font-normal tabular-nums text-muted-foreground">({leads.length})</span>
            </CardTitle>
            <Button variant="outline" size="sm" disabled={leadsLoading} onClick={() => void loadLeads()}>
              {leadsLoading ? <Spinner size="sm" className="text-current" /> : <RefreshCw />}
              {t("site.leads.refresh")}
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable<SiteLead>
              loading={leadsLoading}
              dataSource={leads}
              columns={leadsColumns}
              rowKey="id"
              size="small"
              scroll={{ x: "max-content" }}
              pagination={{
                pageSize: 10,
                showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
              }}
              locale={{
                emptyText: <EmptyState title={t("site.leads.empty")} style={{ padding: "24px 0" }} />,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </UserContentLayout>
  );
}

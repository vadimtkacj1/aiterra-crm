import { ReloadOutlined } from "@ant-design/icons";
import { App, Button, Card, Flex, Grid, Select, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminAccountRow } from "@/services/admin/AdminService";
import type { SiteLeadAdmin } from "@/domain/Site";
import { useApp } from "@/app/AppProviders";
import { AppTable } from "../../../shared/components/AppTable";
import { EmptyState } from "../../../shared/components/EmptyState";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponsiveCardView } from "../../../shared/components/ResponsiveCardView";

const { Link, Text } = Typography;

/** Isolate LTR data (phone, email, dates, URLs) so it doesn't bidi-reorder inside an RTL cell. */
function Ltr({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: "isolate", fontVariantNumeric: "tabular-nums" }}>
      {children}
    </span>
  );
}

export function AdminLeadsPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { services } = useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [leads, setLeads] = useState<SiteLeadAdmin[]>([]);
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [filterAccountId, setFilterAccountId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await services.admin.listAccounts();
      setAccounts(data);
    } catch {
      /* non-critical */
    }
  }, [services.admin]);

  const load = useCallback(async (accountId?: number) => {
    setLoading(true);
    try {
      const data = await services.admin.listAllLeads(accountId);
      setLeads(data);
    } catch {
      void message.error(t("admin.leads.loadError"));
    } finally {
      setLoading(false);
    }
  }, [services.admin, message, t]);

  useEffect(() => {
    void loadAccounts();
    void load();
  }, [loadAccounts, load]);

  function onAccountFilter(value: number | undefined) {
    setFilterAccountId(value);
    void load(value);
  }

  const columns: ColumnsType<SiteLeadAdmin> = [
    {
      title: t("admin.leads.colAccount"),
      key: "account",
      width: 160,
      ellipsis: true,
      render: (_, r) => (
        <Text strong>{r.accountName}</Text>
      ),
    },
    {
      title: t("admin.leads.colName"),
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      width: 150,
    },
    {
      title: t("admin.leads.colPhone"),
      dataIndex: "phone",
      key: "phone",
      render: (v: string | null) => (v ? <Ltr>{v}</Ltr> : "—"),
      width: 130,
    },
    {
      title: t("admin.leads.colEmail"),
      dataIndex: "email",
      key: "email",
      render: (v: string | null) => (v ? <Ltr>{v}</Ltr> : "—"),
      ellipsis: true,
      width: 200,
      responsive: ["xl"],
    },
    {
      title: t("admin.leads.colMessage"),
      dataIndex: "message",
      key: "message",
      ellipsis: true,
      width: 260,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={<span style={{ whiteSpace: "pre-wrap" }}>{v}</span>} overlayStyle={{ maxWidth: 400 }}>
            <Text ellipsis style={{ maxWidth: "100%", display: "block", cursor: "default" }}>{v}</Text>
          </Tooltip>
        ) : (
          "—"
        ),
    },
    {
      title: t("admin.leads.colTreatment"),
      dataIndex: "treatment",
      key: "treatment",
      width: 160,
      responsive: ["xl"],
      render: (v: string | null) => v ?? "—",
    },
    {
      title: t("admin.leads.colSource"),
      dataIndex: "source",
      key: "source",
      ellipsis: true,
      width: 200,
      responsive: ["xl"],
      render: (v: string | null) => {
        if (!v) return "—";
        let label = v;
        try {
          const url = new URL(v);
          if (url.protocol === "file:") {
            label = url.pathname.split("/").filter(Boolean).pop() ?? v;
          } else {
            label = url.hostname + (url.pathname !== "/" ? url.pathname : "");
          }
        } catch {
          label = v;
        }
        return (
          <Tooltip title={v}>
            <Link href={v} target="_blank" ellipsis style={{ maxWidth: 190 }}>
              <Ltr>{label}</Ltr>
            </Link>
          </Tooltip>
        );
      },
    },
    {
      title: t("admin.leads.colDate"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => <Ltr>{new Date(v).toLocaleString()}</Ltr>,
      width: 155,
    },
  ];

  const emptyState = (
    <EmptyState
      title={t("admin.leads.empty")}
      description={t("admin.leads.emptyDesc")}
      action={
        filterAccountId != null
          ? { label: t("admin.leads.clearFilter"), onClick: () => onAccountFilter(undefined), type: "default" }
          : undefined
      }
    />
  );

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.leads.title")}
        subtitle={t("admin.leads.subtitle")}
      />
      <Card styles={{ body: { padding: isMobile ? 12 : 16 } }}>
        <Flex vertical gap={16}>
          <Flex align="center" justify="space-between" gap={8} wrap>
            <Select
              allowClear
              placeholder={t("admin.leads.filterAccount")}
              style={{ width: isMobile ? 180 : 240 }}
              value={filterAccountId}
              onChange={(v) => onAccountFilter(v as number | undefined)}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => void load(filterAccountId)}
            >
              {!isMobile && t("common.reload")}
            </Button>
          </Flex>
          {isMobile ? (
            <ResponsiveCardView
              items={leads.map((lead) => ({
                id: lead.id,
                title: lead.name,
                subtitle: lead.accountName,
                description: lead.message || undefined,
                tags: [
                  ...(lead.phone ? [{ label: lead.phone }] : []),
                  ...(lead.email ? [{ label: lead.email }] : []),
                ],
                extra: (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </Typography.Text>
                ),
              }))}
              loading={loading}
              emptyText={t("admin.leads.empty")}
            />
          ) : (
            <AppTable<SiteLeadAdmin>
              size="middle"
              loading={loading}
              dataSource={leads}
              columns={columns}
              rowKey="id"
              locale={{ emptyText: emptyState }}
            />
          )}
        </Flex>
      </Card>
    </PageContainer>
  );
}

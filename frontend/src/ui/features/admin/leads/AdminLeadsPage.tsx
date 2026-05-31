import { ReloadOutlined, TeamOutlined } from "@ant-design/icons";
import { App, Button, Grid, Select, Space, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminAccountRow } from "@/services/admin/AdminService";
import type { SiteLeadAdmin } from "@/domain/Site";
import { useApp } from "@/app/AppProviders";
import { AppTable } from "../../../shared/components/AppTable";
import { ListCard } from "../../../shared/components/ListCard";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponsiveCardView } from "../../../shared/components/ResponsiveCardView";

const { Link, Text } = Typography;

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
      render: (v: string | null) => v ?? "—",
      width: 130,
    },
    {
      title: t("admin.leads.colEmail"),
      dataIndex: "email",
      key: "email",
      render: (v: string | null) => v ?? "—",
      ellipsis: true,
      width: 200,
    },
    {
      title: t("admin.leads.colMessage"),
      dataIndex: "message",
      key: "message",
      render: (v: string | null) => v ?? "—",
      ellipsis: true,
    },
    {
      title: t("admin.leads.colSource"),
      dataIndex: "source",
      key: "source",
      ellipsis: true,
      width: 200,
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v}>
            <Link href={v} target="_blank" ellipsis style={{ maxWidth: 190 }}>
              {v}
            </Link>
          </Tooltip>
        ) : (
          "—"
        ),
    },
    {
      title: t("admin.leads.colDate"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => new Date(v).toLocaleString(),
      width: 155,
    },
  ];

  return (
    <PageContainer>
      <PageHeader title={t("admin.leads.title")} description={t("admin.leads.subtitle")} />
      <ListCard
        icon={<TeamOutlined />}
        title={
          <Space>
            {t("admin.leads.title")}
            <Text type="secondary" style={{ fontWeight: 400 }}>({leads.length})</Text>
          </Space>
        }
        extra={
          <Space>
            <Select
              allowClear
              placeholder={t("admin.leads.filterAccount")}
              style={{ width: 200 }}
              value={filterAccountId}
              onChange={(v) => onAccountFilter(v as number | undefined)}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => void load(filterAccountId)}
            >
              {t("common.reload")}
            </Button>
          </Space>
        }
      >
        {isMobile ? (
          <ResponsiveCardView
            items={leads.map((lead) => ({
              id: lead.id,
              title: lead.name,
              subtitle: lead.accountName,
              description: lead.message || undefined,
              tags: [
                ...(lead.phone ? [{ label: lead.phone, color: "blue" }] : []),
                ...(lead.email ? [{ label: lead.email, color: "green" }] : []),
              ],
              extra: (
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(lead.createdAt).toLocaleDateString()}
                </Typography.Text>
              ),
            }))}
            loading={loading}
            emptyText={t("admin.leads.empty")}
          />
        ) : (
          <AppTable<SiteLeadAdmin>
            loading={loading}
            dataSource={leads}
            columns={columns}
            rowKey="id"
            locale={{ emptyText: t("admin.leads.empty") }}
          />
        )}
      </ListCard>
    </PageContainer>
  );
}

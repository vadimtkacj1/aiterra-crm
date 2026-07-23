import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { App, Button, Card, Flex, Input, Table } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminAuditLogRow } from "@/services/admin/AdminService";
import { useApp } from "@/app/AppProviders";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ResponsiveCardView, useMobileView } from "../../../shared/components/ResponsiveCardView";

export function AdminAuditPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { services } = useApp();
  const isMobile = useMobileView();
  const [rows, setRows] = useState<AdminAuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.admin.listAuditLogs(300);
      setRows(data);
    } catch {
      setRows([]);
      void message.error(t("admin.audit.loadError"));
    } finally {
      setLoading(false);
    }
  }, [services.admin, message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.adminEmail, r.action, r.resourceType, r.resourceId, r.detail]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const emptyState = (
    <EmptyState
      title={search ? t("admin.audit.searchEmpty") : t("admin.audit.emptyTitle")}
      description={search ? undefined : t("admin.audit.emptyDescription")}
      action={
        search
          ? { label: t("admin.audit.clearSearch"), onClick: () => setSearch(""), type: "default" }
          : { label: t("common.reload"), onClick: () => void load(), type: "default" }
      }
    />
  );

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.audit.title")}
        description={t("admin.audit.subtitle")}
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            {!isMobile && t("common.reload")}
          </Button>
        }
      />
      <Card styles={{ body: { padding: isMobile ? 12 : 16 } }}>
        <Flex align="center" gap={8} wrap="wrap" style={{ marginBottom: 12 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t("admin.audit.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: isMobile ? "100%" : 280 }}
          />
        </Flex>
        {isMobile ? (
          <ResponsiveCardView
            items={filtered.map((r) => ({
              id: String(r.id),
              title: r.action,
              subtitle: r.adminEmail || (r.adminUserId != null ? `#${r.adminUserId}` : "-"),
              description: new Date(r.createdAt).toLocaleString(),
              tags: r.resourceType ? [{ label: `${r.resourceType} ${r.resourceId || ""}`.trim(), color: "blue" }] : [],
              extra: r.detail ? (
                <div style={{ fontSize: 12, color: "var(--ant-color-text-secondary)", marginTop: 4 }}>
                  {r.detail}
                </div>
              ) : undefined,
            }))}
            loading={loading}
            emptyText={t("common.noData")}
          />
        ) : (
          <Table<AdminAuditLogRow>
            rowKey="id"
            loading={loading}
            size="middle"
            pagination={{ pageSize: 25 }}
            dataSource={filtered}
            scroll={{ x: 900 }}
            locale={{ emptyText: emptyState }}
            columns={[
              {
                title: t("admin.audit.columns.time"),
                dataIndex: "createdAt",
                key: "createdAt",
                width: 180,
                render: (v: string) => (
                  <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    {new Date(v).toLocaleString()}
                  </span>
                ),
              },
              { title: t("admin.audit.columns.admin"), key: "admin", width: 220, render: (_, r) => r.adminEmail || (r.adminUserId != null ? `#${r.adminUserId}` : "-") },
              { title: t("admin.audit.columns.action"), dataIndex: "action", key: "action", width: 200 },
              {
                title: t("admin.audit.columns.resource"),
                key: "resource",
                width: 180,
                render: (_, r) => r.resourceType || "-",
              },
              { title: t("admin.audit.columns.detail"), dataIndex: "detail", key: "detail", ellipsis: true },
            ]}
            expandable={{
              rowExpandable: (r) => Boolean(r.resourceId || r.detail),
              expandedRowRender: (r) => (
                <Flex vertical gap={4}>
                  {r.resourceId ? (
                    <span>
                      <strong>{t("admin.audit.columns.resource")}:</strong>{" "}
                      {[r.resourceType, r.resourceId].filter(Boolean).join(" ")}
                    </span>
                  ) : null}
                  {r.detail ? (
                    <span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      <strong>{t("admin.audit.columns.detail")}:</strong> {r.detail}
                    </span>
                  ) : null}
                </Flex>
              ),
            }}
          />
        )}
      </Card>
    </PageContainer>
  );
}

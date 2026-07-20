import { ReloadOutlined } from "@ant-design/icons";
import { App, Button, Card, Table } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminAuditLogRow } from "@/services/admin/AdminService";
import { useApp } from "@/app/AppProviders";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponsiveCardView, useMobileView } from "../../../shared/components/ResponsiveCardView";

export function AdminAuditPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { services } = useApp();
  const isMobile = useMobileView();
  const [rows, setRows] = useState<AdminAuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);

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
        {isMobile ? (
          <ResponsiveCardView
            items={rows.map((r) => ({
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
            size="small"
            pagination={{ pageSize: 25, showSizeChanger: true }}
            dataSource={rows}
            scroll={{ x: 900 }}
            columns={[
              { title: t("admin.audit.columns.time"), dataIndex: "createdAt", key: "createdAt", width: 200 },
              { title: t("admin.audit.columns.admin"), key: "admin", width: 220, render: (_, r) => r.adminEmail || (r.adminUserId != null ? `#${r.adminUserId}` : "-") },
              { title: t("admin.audit.columns.action"), dataIndex: "action", key: "action", width: 200 },
              {
                title: t("admin.audit.columns.resource"),
                key: "resource",
                width: 180,
                render: (_, r) => [r.resourceType, r.resourceId].filter(Boolean).join(" ") || "-",
              },
              { title: t("admin.audit.columns.detail"), dataIndex: "detail", key: "detail", ellipsis: true },
            ]}
          />
        )}
      </Card>
    </PageContainer>
  );
}

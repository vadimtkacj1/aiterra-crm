import { ReloadOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { App, Button, Table } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminAuditLogRow } from "@/services/admin/AdminService";
import { useApp } from "@/app/AppProviders";
import { ListCard } from "../../../shared/components/ListCard";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";

export function AdminAuditPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { services } = useApp();
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
      <PageHeader title={t("admin.audit.title")} description={t("admin.audit.subtitle")} />
      <ListCard
        icon={<SafetyCertificateOutlined />}
        title={t("admin.audit.title")}
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            {t("common.reload")}
          </Button>
        }
      >
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
      </ListCard>
    </PageContainer>
  );
}

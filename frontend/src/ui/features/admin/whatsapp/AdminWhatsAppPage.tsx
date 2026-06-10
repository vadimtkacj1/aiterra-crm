import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, ReloadOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { App, Button, Popconfirm, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { WaConnectionRow } from "@/services/admin/AdminService";
import { useApp } from "@/app/AppProviders";
import { AppTable } from "../../../shared/components/AppTable";
import { ListCard } from "../../../shared/components/ListCard";
import { PageContainer } from "../../../shared/components/PageContainer";

const { Text } = Typography;

export function AdminWhatsAppPage() {
  const { t } = useTranslation();
  const { services } = useApp();
  const { message } = App.useApp();

  const [rows, setRows] = useState<WaConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.admin.listWhatsAppConnections();
      setRows(data);
    } catch {
      void message.error(t("admin.whatsapp.loadError"));
    } finally {
      setLoading(false);
    }
  }, [services.admin, message, t]);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(phoneId: number) {
    setDeletingId(phoneId);
    try {
      await services.admin.deleteWhatsAppPhone(phoneId);
      void message.success(t("admin.whatsapp.deleted"));
      setRows((prev) => prev.filter((r) => r.phoneId !== phoneId));
    } catch {
      void message.error(t("admin.whatsapp.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  const columns: ColumnsType<WaConnectionRow> = [
    {
      title: t("admin.whatsapp.colAccount"),
      key: "account",
      ellipsis: true,
      render: (_, r) => <Text strong>{r.accountName}</Text>,
    },
    {
      title: t("admin.whatsapp.colEmail"),
      dataIndex: "ownerEmail",
      key: "ownerEmail",
      ellipsis: true,
      render: (v: string | null) => v ?? "—",
    },
    {
      title: t("admin.whatsapp.colLabel"),
      dataIndex: "label",
      key: "label",
      width: 120,
      render: (v: string | null) => v
        ? <Text type="secondary">{v}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: t("admin.whatsapp.colStatus"),
      key: "status",
      width: 130,
      render: (_, r) =>
        r.verified ? (
          <Tag icon={<CheckCircleOutlined />} color="success">{t("admin.whatsapp.statusConnected")}</Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="default">{t("admin.whatsapp.statusNone")}</Tag>
        ),
    },
    {
      title: t("admin.whatsapp.colPhone"),
      key: "phone",
      width: 160,
      render: (_, r) => r.phone
        ? <Text copyable style={{ fontFamily: "monospace" }}>{r.phone}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: t("admin.whatsapp.colCode"),
      dataIndex: "connectCode",
      key: "connectCode",
      width: 140,
      render: (v: string) => (
        <Tag style={{ fontFamily: "monospace", letterSpacing: 1 }}>{v}</Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 90,
      render: (_, r) => (
        <Popconfirm
          title={t("admin.whatsapp.deleteConfirm")}
          onConfirm={() => void handleDelete(r.phoneId)}
          okText={t("common.confirm")}
          cancelText={t("common.cancel")}
          okButtonProps={{ danger: true }}
        >
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            loading={deletingId === r.phoneId}
          />
        </Popconfirm>
      ),
    },
  ];

  const connected = rows.filter((r) => r.verified).length;

  return (
    <PageContainer>
      <ListCard
        icon={<WhatsAppOutlined style={{ color: "#25d366" }} />}
        title={
          <span>
            {t("admin.whatsapp.title")}
            <Text type="secondary" style={{ fontWeight: 400, marginLeft: 8 }}>
              ({connected} {t("admin.whatsapp.connectedCount")})
            </Text>
          </span>
        }
        extra={
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
            {t("common.reload")}
          </Button>
        }
      >
        <AppTable<WaConnectionRow>
          loading={loading}
          dataSource={rows}
          rowKey="phoneId"
          columns={columns}
          locale={{ emptyText: t("admin.whatsapp.empty") }}
        />
      </ListCard>
    </PageContainer>
  );
}

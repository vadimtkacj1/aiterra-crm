import {
  CheckCircleFilled, DeleteOutlined, DisconnectOutlined,
  MoreOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, WhatsAppOutlined,
} from "@ant-design/icons";
import { App, Button, Dropdown, Flex, Input, Popconfirm, Tooltip, Typography } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Paths } from "../../../navigation/paths";
import type { AdminWaPhone, WaConnectionRow } from "@/services/admin/AdminService";
import { useApp } from "@/app/AppProviders";
import { AppTable } from "../../../shared/components/AppTable";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ListCard } from "../../../shared/components/ListCard";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";

const { Text } = Typography;

function AdminPhonesSection() {
  const { t } = useTranslation();
  const { services } = useApp();
  const { message } = App.useApp();

  const [phones, setPhones] = useState<AdminWaPhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPhones(await services.admin.listAdminWaPhones());
    } catch {
      void message.error(t("admin.whatsapp.admin.loadError"));
    } finally {
      setLoading(false);
    }
  }, [services.admin, message, t]);

  useEffect(() => { void load(); }, [load]);

  async function handleAdd() {
    const phone = newPhone.trim();
    if (!phone) return;
    setAdding(true);
    try {
      const row = await services.admin.addAdminWaPhone(phone, newLabel.trim() || undefined);
      setPhones((prev) => [...prev, row]);
      setNewPhone(""); setNewLabel(""); setShowForm(false);
    } catch {
      void message.error(t("admin.whatsapp.admin.addError"));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await services.admin.deleteAdminWaPhone(id);
      setPhones((prev) => prev.filter((p) => p.id !== id));
    } catch {
      void message.error(t("admin.whatsapp.admin.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ListCard
      title={t("admin.whatsapp.admin.title")}
      loading={loading && phones.length === 0}
      extra={
        !showForm ? (
          <Button icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
            {t("admin.whatsapp.admin.addBtn")}
          </Button>
        ) : undefined
      }
    >
      <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 16 }}>
        {t("admin.whatsapp.admin.hint")}
      </Text>

      <Flex wrap="wrap" gap={8}>
        {!loading && phones.length === 0 && (
          <Text type="secondary" style={{ fontSize: 13 }}>{t("admin.whatsapp.admin.empty")}</Text>
        )}
        {phones.map((p) => (
          <span
            key={p.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              paddingBlock: 4,
              paddingInline: "10px 4px",
              background: "var(--ds-surface-1)",
              border: "1px solid var(--ds-border-default)",
              borderRadius: "var(--ds-radius-lg)",
            }}
          >
            <WhatsAppOutlined style={{ color: "var(--ds-text-tertiary)", fontSize: 14 }} />
            <span
              dir="ltr"
              style={{
                fontFamily: "var(--ds-font-family-mono)",
                fontSize: 13,
                fontVariantNumeric: "tabular-nums",
                color: "var(--ds-text-primary)",
              }}
            >
              {p.phone}
            </span>
            {p.label && (
              <Text type="secondary" style={{ fontSize: 12 }}>{p.label}</Text>
            )}
            <Popconfirm
              title={t("admin.whatsapp.admin.deleteConfirm")}
              onConfirm={() => void handleDelete(p.id)}
              okText={t("common.confirm")}
              cancelText={t("common.cancel")}
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                type="text"
                icon={<DeleteOutlined />}
                loading={deletingId === p.id}
              />
            </Popconfirm>
          </span>
        ))}
      </Flex>

      {showForm && (
        <Flex gap={8} wrap="wrap" align="center" style={{ marginTop: 16 }}>
          <Input
            prefix={<WhatsAppOutlined style={{ color: "var(--ds-text-tertiary)" }} />}
            placeholder="+972501234567"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            style={{ width: 200 }}
            onPressEnter={() => void handleAdd()}
          />
          <Input
            placeholder={t("admin.whatsapp.admin.labelPlaceholder")}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            style={{ width: 160 }}
            onPressEnter={() => void handleAdd()}
          />
          <Button type="primary" loading={adding} onClick={() => void handleAdd()}>
            {t("admin.whatsapp.admin.addConfirm")}
          </Button>
          <Button onClick={() => { setShowForm(false); setNewPhone(""); setNewLabel(""); }}>
            {t("common.cancel")}
          </Button>
        </Flex>
      )}
    </ListCard>
  );
}

export function AdminWhatsAppPage() {
  const { t } = useTranslation();
  const { services } = useApp();
  const { message, modal } = App.useApp();
  const navigate = useNavigate();

  const [rows, setRows] = useState<WaConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null);

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

  async function handleDisconnect(phoneId: number) {
    setDisconnectingId(phoneId);
    try {
      await services.admin.disconnectWhatsAppPhone(phoneId);
      void message.success(t("admin.whatsapp.disconnected"));
      setRows((prev) => prev.map((r) => r.phoneId === phoneId ? { ...r, phone: null, verified: false } : r));
    } catch {
      void message.error(t("admin.whatsapp.disconnectError"));
    } finally {
      setDisconnectingId(null);
    }
  }

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.accountName.toLowerCase().includes(q) ||
      (r.ownerEmail ?? "").toLowerCase().includes(q) ||
      (r.phone ?? "").toLowerCase().includes(q) ||
      (r.label ?? "").toLowerCase().includes(q) ||
      r.connectCode.toLowerCase().includes(q),
    );
  }, [rows, search]);

  function confirmDisconnect(r: WaConnectionRow) {
    modal.confirm({
      title: t("admin.whatsapp.disconnectConfirm"),
      okText: t("admin.whatsapp.disconnectOk"),
      cancelText: t("common.cancel"),
      okButtonProps: { danger: true },
      onOk: () => handleDisconnect(r.phoneId),
    });
  }

  function confirmDelete(r: WaConnectionRow) {
    modal.confirm({
      title: t("admin.whatsapp.deleteConfirm"),
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      okButtonProps: { danger: true },
      onOk: () => handleDelete(r.phoneId),
    });
  }

  const columns: ColumnsType<WaConnectionRow> = [
    {
      title: t("admin.whatsapp.colAccount"),
      key: "account",
      ellipsis: true,
      render: (_, r) => (
        <Flex vertical gap={0}>
          <Text strong>{r.accountName}</Text>
          {(r.ownerEmail || r.label) && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {[r.ownerEmail, r.label].filter(Boolean).join(" · ")}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: t("admin.whatsapp.colPhone"),
      key: "phone",
      width: 220,
      render: (_, r) => r.verified && r.phone
        ? (
          <Flex align="center" gap={8}>
            <Tooltip title={t("admin.whatsapp.statusConnected")}>
              <CheckCircleFilled style={{ color: "var(--ds-color-success)", fontSize: 10 }} />
            </Tooltip>
            <Text copyable={{ text: r.phone }} style={{ fontFamily: "var(--ds-font-family-mono)", fontVariantNumeric: "tabular-nums" }}>
              <span dir="ltr">{r.phone}</span>
            </Text>
          </Flex>
        )
        : (
          <Flex vertical gap={0}>
            <Text copyable={{ text: r.connectCode }} style={{ fontFamily: "var(--ds-font-family-mono)", letterSpacing: 1 }}>
              {r.connectCode}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{t("admin.whatsapp.statusNone")}</Text>
          </Flex>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 48,
      render: (_, r) => {
        const items: MenuProps["items"] = [
          ...(r.verified
            ? [{ key: "unlink", icon: <DisconnectOutlined />, label: t("admin.whatsapp.disconnectBtn") }]
            : []),
          { key: "delete", icon: <DeleteOutlined />, danger: true, label: t("admin.whatsapp.deleteBtn") },
        ];
        return (
          <Dropdown
            trigger={["click"]}
            menu={{
              items,
              onClick: ({ key }) => {
                if (key === "unlink") confirmDisconnect(r);
                if (key === "delete") confirmDelete(r);
              },
            }}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              loading={disconnectingId === r.phoneId || deletingId === r.phoneId}
            />
          </Dropdown>
        );
      },
    },
  ];

  const connected = rows.filter((r) => r.verified).length;

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.whatsapp.title")}
        subtitle={t("admin.whatsapp.subtitle")}
        actions={
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
            {t("common.reload")}
          </Button>
        }
      />

      <Flex vertical gap={24}>
        <AdminPhonesSection />

        <ListCard>
          <Flex align="center" justify="space-between" gap={12} wrap="wrap" style={{ marginBottom: 16 }}>
            <Input
              prefix={<SearchOutlined />}
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ width: 260, maxWidth: "100%" }}
            />
            <Text type="secondary" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
              {connected}/{rows.length} {t("admin.whatsapp.connectedCount")}
            </Text>
          </Flex>

          <AppTable<WaConnectionRow>
            loading={loading}
            dataSource={filtered}
            rowKey="phoneId"
            columns={columns}
            locale={{
              emptyText: search ? (
                <EmptyState title={t("admin.whatsapp.searchEmpty")} />
              ) : (
                <EmptyState
                  title={t("admin.whatsapp.empty")}
                  description={t("admin.whatsapp.emptyDesc")}
                  action={{ label: t("admin.whatsapp.emptyAction"), onClick: () => void navigate(Paths.adminUsers) }}
                />
              ),
            }}
          />
        </ListCard>
      </Flex>
    </PageContainer>
  );
}

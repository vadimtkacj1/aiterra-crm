import {
  Copy, MessageCircle, MoreHorizontal, Plus, RefreshCw, Search, Trash2, Unlink, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { MenuDropdown, type MenuCompatItemType } from "@/components/ui/menu-compat";
import { Spinner } from "@/components/ui/spinner";
import { confirm } from "@/lib/confirm";
import { message } from "@/lib/toast";
import { Paths } from "../../../navigation/paths";
import type { AdminWaPhone, WaConnectionRow } from "@/services/admin/AdminService";
import { useApp } from "@/app/AppProviders";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ListCard } from "../../../shared/components/ListCard";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";

function CopyCodeButton({ text, copiedMsg, failedMsg, label }: {
  text: string;
  copiedMsg: string;
  failedMsg: string;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        navigator.clipboard.writeText(text).then(
          () => message.success(copiedMsg),
          () => message.error(failedMsg),
        );
      }}
      className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Copy className="size-3.5" />
    </button>
  );
}

function AdminPhonesSection() {
  const { t } = useTranslation();
  const { services } = useApp();

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
  }, [services.admin, t]);

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
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <Plus aria-hidden="true" />
            {t("admin.whatsapp.admin.addBtn")}
          </Button>
        ) : undefined
      }
    >
      <p className="mb-4 mt-0 text-[13px] text-muted-foreground">
        {t("admin.whatsapp.admin.hint")}
      </p>

      <div className="flex flex-wrap gap-2">
        {!loading && phones.length === 0 && (
          <span className="text-[13px] text-muted-foreground">{t("admin.whatsapp.admin.empty")}</span>
        )}
        {phones.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-(--ds-surface-1) py-1 ps-2.5 pe-1"
          >
            <MessageCircle aria-hidden="true" className="size-3.5 text-(--ds-text-tertiary)" />
            <span
              dir="ltr"
              className="font-mono text-[13px] tabular-nums text-foreground"
              style={{ fontFamily: "var(--ds-font-family-mono)" }}
            >
              {p.phone}
            </span>
            {p.label && (
              <span className="text-xs text-muted-foreground">{p.label}</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              aria-label={t("admin.whatsapp.deleteBtn")}
              disabled={deletingId === p.id}
              onClick={() =>
                confirm({
                  title: t("admin.whatsapp.admin.deleteConfirm"),
                  okText: t("common.confirm"),
                  cancelText: t("common.cancel"),
                  danger: true,
                  onOk: () => handleDelete(p.id),
                })
              }
            >
              {deletingId === p.id
                ? <Spinner size="sm" className="text-current" aria-hidden="true" />
                : <Trash2 aria-hidden="true" />}
            </Button>
          </span>
        ))}
      </div>

      {showForm && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative w-[200px]">
            <MessageCircle
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-(--ds-text-tertiary)"
            />
            <Input
              className="ps-9"
              placeholder="+972501234567"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
            />
          </div>
          <Input
            className="w-[160px]"
            placeholder={t("admin.whatsapp.admin.labelPlaceholder")}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
          />
          <Button disabled={adding} onClick={() => void handleAdd()}>
            {adding && <Spinner size="sm" className="text-current" aria-hidden="true" />}
            {t("admin.whatsapp.admin.addConfirm")}
          </Button>
          <Button variant="outline" onClick={() => { setShowForm(false); setNewPhone(""); setNewLabel(""); }}>
            {t("common.cancel")}
          </Button>
        </div>
      )}
    </ListCard>
  );
}

export function AdminWhatsAppPage() {
  const { t } = useTranslation();
  const { services } = useApp();
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
  }, [services.admin, t]);

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
    confirm({
      title: t("admin.whatsapp.disconnectConfirm"),
      okText: t("admin.whatsapp.disconnectOk"),
      cancelText: t("common.cancel"),
      danger: true,
      onOk: () => handleDisconnect(r.phoneId),
    });
  }

  function confirmDelete(r: WaConnectionRow) {
    confirm({
      title: t("admin.whatsapp.deleteConfirm"),
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      danger: true,
      onOk: () => handleDelete(r.phoneId),
    });
  }

  const columns: DataTableColumn<WaConnectionRow>[] = [
    {
      title: t("admin.whatsapp.colAccount"),
      key: "account",
      render: (_, r) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-semibold text-foreground">{r.accountName}</span>
          {(r.ownerEmail || r.label) && (
            <span className="text-xs text-muted-foreground">
              {[r.ownerEmail, r.label].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
      ),
    },
    {
      title: t("admin.whatsapp.colPhone"),
      key: "phone",
      width: 220,
      render: (_, r) => r.verified && r.phone
        ? (
          <div className="flex flex-col items-start gap-1">
            <span className="flex items-center gap-1">
              <span
                dir="ltr"
                className="font-mono tabular-nums"
                style={{ fontFamily: "var(--ds-font-family-mono)" }}
              >
                {r.phone}
              </span>
              <CopyCodeButton
                text={r.phone}
                label={t("common.copyToClipboard")}
                copiedMsg={t("common.copied")}
                failedMsg={t("common.copyFailed")}
              />
            </span>
            <Badge variant="success">{t("admin.whatsapp.statusConnected")}</Badge>
          </div>
        )
        : (
          <div className="flex flex-col items-start gap-1">
            <span className="flex items-center gap-1">
              <span
                className="font-mono tracking-wider"
                style={{ fontFamily: "var(--ds-font-family-mono)" }}
              >
                {r.connectCode}
              </span>
              <CopyCodeButton
                text={r.connectCode}
                label={t("common.copyToClipboard")}
                copiedMsg={t("common.copied")}
                failedMsg={t("common.copyFailed")}
              />
            </span>
            <Badge variant="default">{t("admin.whatsapp.statusNone")}</Badge>
          </div>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 48,
      render: (_, r) => {
        const busy = disconnectingId === r.phoneId || deletingId === r.phoneId;
        const items: MenuCompatItemType[] = [
          ...(r.verified
            ? [{ key: "unlink", icon: <Unlink className="size-4" aria-hidden="true" />, label: t("admin.whatsapp.disconnectBtn") }]
            : []),
          { key: "delete", icon: <Trash2 className="size-4" aria-hidden="true" />, danger: true, label: t("admin.whatsapp.deleteBtn") },
        ];
        return (
          <MenuDropdown
            align="end"
            items={items}
            onClick={({ key }) => {
              if (key === "unlink") confirmDisconnect(r);
              if (key === "delete") confirmDelete(r);
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              aria-label={t("common.actions")}
              disabled={busy}
            >
              {busy
                ? <Spinner size="sm" className="text-current" aria-hidden="true" />
                : <MoreHorizontal aria-hidden="true" />}
            </Button>
          </MenuDropdown>
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
          <Button variant="outline" disabled={loading} onClick={() => void load()}>
            {loading
              ? <Spinner size="sm" className="text-current" aria-hidden="true" />
              : <RefreshCw aria-hidden="true" />}
            {t("common.reload")}
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <AdminPhonesSection />

        <ListCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-[260px] max-w-full">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
              />
              <Input
                className="ps-9 pe-8"
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label={t("common.cancel")}
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 end-2 my-auto flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <span className="text-[13px] tabular-nums text-muted-foreground">
              {connected}/{rows.length} {t("admin.whatsapp.connectedCount")}
            </span>
          </div>

          <DataTable<WaConnectionRow>
            loading={loading}
            dataSource={filtered}
            rowKey="phoneId"
            size="small"
            columns={columns}
            scroll={{ x: "max-content" }}
            pagination={{
              pageSize: 10,
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
            }}
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
      </div>
    </PageContainer>
  );
}

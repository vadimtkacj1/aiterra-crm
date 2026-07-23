import { CircleCheck, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WhatsAppIcon } from "@/components/icons/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { confirm } from "@/lib/confirm";
import { message } from "@/lib/toast";
import { useApp } from "@/app/AppProviders";
import type { WaPhoneRow } from "@/services/admin/AdminService";

type Props = {
  userId: string;
};

export function WaPhoneManager({ userId }: Props) {
  const { t } = useTranslation();
  const { services } = useApp();

  const [phones, setPhones] = useState<WaPhoneRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.admin.listWaPhones(userId);
      setPhones(data);
    } catch {
      message.error(t("admin.whatsapp.phones.loadError"));
    } finally {
      setLoading(false);
    }
  }, [services.admin, userId, t]);

  useEffect(() => { void load(); }, [load]);

  async function handleAdd() {
    setAdding(true);
    try {
      const phone = await services.admin.addWaPhone(
        userId,
        newLabel.trim() || undefined,
        newPhone.trim() || undefined,
      );
      setPhones((prev) => [...prev, phone]);
      setNewLabel("");
      setNewPhone("");
      setShowAddForm(false);
    } catch {
      message.error(t("admin.whatsapp.phones.addError"));
    } finally {
      setAdding(false);
    }
  }

  async function handleSavePhone(phoneId: number) {
    setSavingId(phoneId);
    try {
      const updated = await services.admin.updateWaPhone(userId, phoneId, {
        phone: editPhone.trim() || null,
      });
      setPhones((prev) => prev.map((p) => (p.id === phoneId ? updated : p)));
      setEditingId(null);
    } catch {
      message.error(t("admin.whatsapp.phones.addError"));
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(phoneId: number) {
    setDeletingId(phoneId);
    try {
      await services.admin.deleteWaPhone(userId, phoneId);
      setPhones((prev) => prev.filter((p) => p.id !== phoneId));
    } catch {
      message.error(t("admin.whatsapp.phones.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  function confirmDelete(phoneId: number) {
    confirm({
      title: t("admin.whatsapp.phones.deleteConfirm"),
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      danger: true,
      onOk: async () => {
        await handleDelete(phoneId);
      },
    });
  }

  function startEdit(p: WaPhoneRow) {
    setEditingId(p.id);
    setEditPhone(p.phone ?? "");
  }

  return (
    <div className="relative mt-1">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
          <Spinner size="sm" />
        </div>
      )}

      {phones.length === 0 && !loading && (
        <span className="text-[13px] text-muted-foreground">
          {t("admin.whatsapp.phones.empty")}
        </span>
      )}

      {phones.map((p) => (
        <div
          key={p.id}
          className="flex flex-wrap items-center gap-2 border-b py-1.5"
          style={{ borderColor: "var(--ds-color-border-subtle, var(--ds-border-subtle))" }}
        >
          {/* Connect code */}
          <Badge variant="primary" className="m-0 font-mono text-xs tracking-widest">
            {p.connectCode}
          </Badge>

          {/* Phone / edit inline */}
          {editingId === p.id ? (
            <>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+972501234567"
                className="h-8 w-[150px] text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSavePhone(p.id);
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                disabled={savingId === p.id}
                onClick={() => void handleSavePhone(p.id)}
              >
                {savingId === p.id && <Spinner size="sm" className="text-current" />}
                {t("common.save")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={t("common.cancel")}
                onClick={() => setEditingId(null)}
              >
                <X />
              </Button>
            </>
          ) : (
            <>
              {p.verified ? (
                <span className="inline-flex items-center gap-1 text-[13px]" style={{ color: "var(--ds-color-success)" }}>
                  <CircleCheck className="size-3.5" />
                  {p.phone}
                </span>
              ) : (
                <span className="text-[13px] text-muted-foreground">
                  {t("admin.whatsapp.phones.notConnected")}
                </span>
              )}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={t("admin.whatsapp.phones.editPhone")}
                      onClick={() => startEdit(p)}
                    >
                      <Pencil />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("admin.whatsapp.phones.editPhone")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          {/* Label */}
          {p.label && (
            <span className="text-xs text-muted-foreground">({p.label})</span>
          )}

          {/* Delete */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={deletingId === p.id}
            aria-label={t("common.remove")}
            className="ms-auto text-destructive hover:text-destructive"
            onClick={() => confirmDelete(p.id)}
          >
            {deletingId === p.id ? <Spinner size="sm" className="text-current" /> : <Trash2 />}
          </Button>
        </div>
      ))}

      {showAddForm ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <div className="relative w-[160px]">
            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-2.5">
              <WhatsAppIcon className="text-[#25d366]" />
            </span>
            <Input
              placeholder="+972501234567"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="h-8 ps-8 text-sm"
            />
          </div>
          <Input
            placeholder={t("admin.whatsapp.phones.labelPlaceholder")}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="h-8 w-[140px] text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAdd();
              }
            }}
          />
          <Button type="button" size="sm" disabled={adding} onClick={() => void handleAdd()}>
            {adding && <Spinner size="sm" className="text-current" />}
            {t("admin.whatsapp.phones.addConfirm")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => { setShowAddForm(false); setNewLabel(""); setNewPhone(""); }}
          >
            {t("common.cancel")}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => setShowAddForm(true)}
        >
          <Plus />
          {t("admin.whatsapp.phones.addBtn")}
        </Button>
      )}
    </div>
  );
}

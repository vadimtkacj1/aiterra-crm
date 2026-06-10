import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, EditOutlined, CloseOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { App, Button, Input, Popconfirm, Spin, Tag, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/app/AppProviders";
import type { WaPhoneRow } from "@/services/admin/AdminService";

const { Text } = Typography;

type Props = {
  userId: string;
};

export function WaPhoneManager({ userId }: Props) {
  const { t } = useTranslation();
  const { services } = useApp();
  const { message } = App.useApp();

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
      void message.error(t("admin.whatsapp.phones.loadError"));
    } finally {
      setLoading(false);
    }
  }, [services.admin, userId, message, t]);

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
      void message.error(t("admin.whatsapp.phones.addError"));
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
      void message.error(t("admin.whatsapp.phones.addError"));
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
      void message.error(t("admin.whatsapp.phones.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(p: WaPhoneRow) {
    setEditingId(p.id);
    setEditPhone(p.phone ?? "");
  }

  return (
    <div style={{ marginTop: 4 }}>
      <Spin spinning={loading}>
        {phones.length === 0 && !loading && (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t("admin.whatsapp.phones.empty")}
          </Text>
        )}
        {phones.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 0",
              borderBottom: "1px solid var(--ds-color-border-subtle, #f0f0f0)",
              flexWrap: "wrap",
            }}
          >
            {/* Connect code */}
            <Tag
              style={{ fontFamily: "monospace", letterSpacing: 1, fontSize: 12, margin: 0 }}
              color="blue"
            >
              {p.connectCode}
            </Tag>

            {/* Phone / edit inline */}
            {editingId === p.id ? (
              <>
                <Input
                  size="small"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+972501234567"
                  style={{ width: 150 }}
                  onPressEnter={() => void handleSavePhone(p.id)}
                />
                <Button
                  size="small"
                  type="primary"
                  loading={savingId === p.id}
                  onClick={() => void handleSavePhone(p.id)}
                >
                  {t("common.save")}
                </Button>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => setEditingId(null)}
                />
              </>
            ) : (
              <>
                {p.verified ? (
                  <Text style={{ color: "#52c41a", fontSize: 13 }}>
                    <CheckCircleOutlined style={{ marginRight: 4 }} />
                    {p.phone}
                  </Text>
                ) : (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {t("admin.whatsapp.phones.notConnected")}
                  </Text>
                )}
                <Tooltip title={t("admin.whatsapp.phones.editPhone")}>
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => startEdit(p)}
                  />
                </Tooltip>
              </>
            )}

            {/* Label */}
            {p.label && (
              <Text type="secondary" style={{ fontSize: 12 }}>({p.label})</Text>
            )}

            {/* Delete */}
            <Popconfirm
              title={t("admin.whatsapp.phones.deleteConfirm")}
              onConfirm={() => void handleDelete(p.id)}
              okText={t("common.confirm")}
              cancelText={t("common.cancel")}
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deletingId === p.id}
                style={{ marginLeft: "auto" }}
              />
            </Popconfirm>
          </div>
        ))}
      </Spin>

      {showAddForm ? (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Input
            size="small"
            prefix={<WhatsAppOutlined style={{ color: "#25d366" }} />}
            placeholder="+972501234567"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            style={{ width: 160 }}
          />
          <Input
            size="small"
            placeholder={t("admin.whatsapp.phones.labelPlaceholder")}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onPressEnter={() => void handleAdd()}
            style={{ width: 140 }}
          />
          <Button size="small" type="primary" loading={adding} onClick={() => void handleAdd()}>
            {t("admin.whatsapp.phones.addConfirm")}
          </Button>
          <Button size="small" onClick={() => { setShowAddForm(false); setNewLabel(""); setNewPhone(""); }}>
            {t("common.cancel")}
          </Button>
        </div>
      ) : (
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setShowAddForm(true)}
          style={{ marginTop: 8 }}
        >
          {t("admin.whatsapp.phones.addBtn")}
        </Button>
      )}
    </div>
  );
}

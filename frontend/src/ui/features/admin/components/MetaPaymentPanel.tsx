import { HistoryOutlined, ReloadOutlined } from "@ant-design/icons";
import { App, Button, Card, Table } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminAccountRow, MetaTopupRecord } from "../../../../services/AdminService";
import { useApp } from "../../../../app/AppProviders";

export function MetaPaymentPanel() {
  const { t } = useTranslation();
  const { services } = useApp();
  const { message } = App.useApp();
  const messageRef = useRef(message);
  messageRef.current = message;
  const tRef = useRef(t);
  tRef.current = t;

  const [topups, setTopups] = useState<MetaTopupRecord[]>([]);
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tu, acc] = await Promise.all([services.admin.listTopups(), services.admin.listAccounts()]);
      setTopups(tu);
      setAccounts(acc);
    } catch (e) {
      void messageRef.current.error(e instanceof Error ? e.message : tRef.current("admin.loadError"));
      setTopups([]);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [services.admin]);

  useEffect(() => {
    void load();
  }, [load]);

  const accountName = (id: number) => accounts.find((a) => a.id === id)?.name ?? `#${id}`;

  return (
    <div style={{ maxWidth: 960 }}>
      <Card
        title={
          <span>
            <HistoryOutlined style={{ marginRight: 8 }} />
            {t("admin.topup.history")}
          </span>
        }
        size="small"
        styles={{ body: { padding: 0 } }}
        extra={
          <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
            {t("common.reload")}
          </Button>
        }
      >
        <Table
          size="small"
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          dataSource={topups}
          columns={[
            {
              title: t("admin.topup.colDate"),
              dataIndex: "createdAt",
              key: "createdAt",
              width: 180,
              render: (s: string) => (s ? s.slice(0, 19).replace("T", " ") : "—"),
            },
            {
              title: t("admin.topup.colAccount"),
              dataIndex: "accountId",
              key: "account",
              render: (id: number) => accountName(id),
            },
            {
              title: t("admin.topup.colAmount"),
              key: "amt",
              width: 120,
              render: (_: unknown, r: MetaTopupRecord) => `${r.amount} ${r.currency}`,
            },
            {
              title: t("admin.topup.colStatus"),
              dataIndex: "status",
              key: "status",
              width: 120,
              render: (s: string) =>
                s === "sent_to_meta"
                  ? t("admin.topup.statusSent")
                  : s === "failed"
                    ? t("admin.topup.statusFailed")
                    : t("admin.topup.statusPending"),
            },
            {
              title: t("admin.topup.colError"),
              dataIndex: "metaError",
              key: "err",
              ellipsis: true,
              render: (e: string | null) => e || "—",
            },
          ]}
        />
      </Card>
    </div>
  );
}

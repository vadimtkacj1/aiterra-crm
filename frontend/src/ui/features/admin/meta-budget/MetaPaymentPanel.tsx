import { App, Card, Grid, Table, Tag, Tooltip } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminAccountRow, MetaTopupRecord } from "@/services/admin/AdminService";
import { useApp } from "../../../../app/AppProviders";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ResponsiveCardView } from "../../../shared/components/ResponsiveCardView";

interface MetaPaymentPanelProps {
  /** Bump to trigger a reload from outside (e.g. the page-header reload button). */
  refreshToken?: number;
  onLoadingChange?: (loading: boolean) => void;
}

export function MetaPaymentPanel({ refreshToken = 0, onLoadingChange }: MetaPaymentPanelProps) {
  const { t } = useTranslation();
  const { services } = useApp();
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const messageRef = useRef(message);
  messageRef.current = message;
  const tRef = useRef(t);
  tRef.current = t;
  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;

  const [topups, setTopups] = useState<MetaTopupRecord[]>([]);
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    onLoadingChangeRef.current?.(true);
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
      onLoadingChangeRef.current?.(false);
    }
  }, [services.admin]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const accountName = (id: number) => accounts.find((a) => a.id === id)?.name ?? `#${id}`;

  const getStatusLabel = (status: string) =>
    status === "sent_to_meta"
      ? t("admin.topup.statusSent")
      : status === "failed"
        ? t("admin.topup.statusFailed")
        : t("admin.topup.statusPending");

  const getStatusColor = (status: string) =>
    status === "sent_to_meta" ? "success" : status === "failed" ? "error" : "processing";

  return (
    <Card styles={{ body: { padding: isMobile ? 12 : 16 } }}>
      {isMobile ? (
        <ResponsiveCardView
          items={topups.map((r) => ({
            id: r.id,
            title: accountName(r.accountId),
            subtitle: r.createdAt ? r.createdAt.slice(0, 19).replace("T", " ") : "-",
            description: r.metaError || undefined,
            tags: [
              { label: `${r.amount} ${r.currency}` },
              { label: getStatusLabel(r.status), color: getStatusColor(r.status) },
            ],
          }))}
          loading={loading}
          emptyText={t("admin.topup.emptyTitle")}
        />
      ) : (
        <Table
          size="middle"
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: (
              <EmptyState
                title={t("admin.topup.emptyTitle")}
                description={t("admin.topup.emptyDescription")}
              />
            ),
          }}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          dataSource={topups}
          columns={[
            {
              title: t("admin.topup.colDate"),
              dataIndex: "createdAt",
              key: "createdAt",
              width: 180,
              onCell: () => ({ style: { fontVariantNumeric: "tabular-nums" } }),
              render: (s: string) => (s ? s.slice(0, 19).replace("T", " ") : "-"),
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
              onCell: () => ({ style: { fontVariantNumeric: "tabular-nums" } }),
              render: (_: unknown, r: MetaTopupRecord) => `${r.amount} ${r.currency}`,
            },
            {
              title: t("admin.topup.colStatus"),
              dataIndex: "status",
              key: "status",
              width: 120,
              render: (s: string, r: MetaTopupRecord) => {
                const tag = <Tag color={getStatusColor(s)}>{getStatusLabel(s)}</Tag>;
                return s === "failed" && r.metaError
                  ? <Tooltip title={r.metaError}>{tag}</Tooltip>
                  : tag;
              },
            },
          ]}
        />
      )}
    </Card>
  );
}

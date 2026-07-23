import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { message } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { AdminAccountRow, MetaTopupRecord } from "@/services/admin/AdminService";
import { useApp } from "../../../../app/AppProviders";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ResponsiveCardView, useMobileView } from "../../../shared/components/ResponsiveCardView";
import { formatMoney } from "../payments/billingUi";

/** "2026-07-23T14:22:31" → "2026-07-23 14:22" — seconds add noise, not information. */
function fmtDate(iso: string | null | undefined) {
  return iso ? String(iso).slice(0, 16).replace("T", " ") : "-";
}

interface MetaPaymentPanelProps {
  /** Bump to trigger a reload from outside (e.g. the page-header reload button). */
  refreshToken?: number;
  onLoadingChange?: (loading: boolean) => void;
}

export function MetaPaymentPanel({ refreshToken = 0, onLoadingChange }: MetaPaymentPanelProps) {
  const { t } = useTranslation();
  const { services } = useApp();
  const isMobile = useMobileView();
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
      void message.error(e instanceof Error ? e.message : tRef.current("admin.loadError"));
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
    <Card className={cn(isMobile ? "p-4" : "p-6")}>
      {isMobile ? (
        <ResponsiveCardView
          items={topups.map((r) => ({
            id: r.id,
            title: accountName(r.accountId),
            subtitle: fmtDate(r.createdAt),
            description: r.metaError || undefined,
            tags: [
              { label: formatMoney(r.amount, r.currency) },
              { label: getStatusLabel(r.status), color: getStatusColor(r.status) },
            ],
          }))}
          loading={loading}
          emptyText={t("admin.topup.emptyTitle")}
        />
      ) : (
        <DataTable<MetaTopupRecord>
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
          pagination={{ pageSize: 15 }}
          dataSource={topups}
          columns={[
            {
              title: t("admin.topup.colDate"),
              dataIndex: "createdAt",
              key: "createdAt",
              width: 160,
              render: (s) => (
                <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                  {fmtDate(s as string | null)}
                </span>
              ),
            },
            {
              title: t("admin.topup.colAccount"),
              dataIndex: "accountId",
              key: "account",
              render: (id) => <span className="font-medium">{accountName(id as number)}</span>,
            },
            {
              title: t("admin.topup.colAmount"),
              key: "amt",
              width: 120,
              align: "end",
              render: (_, r) => (
                <span className="font-medium tabular-nums">{formatMoney(r.amount, r.currency)}</span>
              ),
            },
            {
              title: t("admin.topup.colStatus"),
              dataIndex: "status",
              key: "status",
              width: 120,
              render: (s, r) => {
                const status = s as string;
                const badge = (
                  <Badge variant={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
                );
                return status === "failed" && r.metaError
                  ? (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>{badge}</TooltipTrigger>
                        <TooltipContent>{r.metaError}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                  : badge;
              },
            },
          ]}
        />
      )}
    </Card>
  );
}

import { Download, Trash2, Undo2 } from "lucide-react";
import type { TFunction } from "i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Spinner } from "@/components/ui/spinner";
import { confirm } from "@/lib/confirm";
import type {
  AdminService,
  BillingHistoryWithAccountRow,
  UserBusinessMeta,
} from "@/services/admin/AdminService";
import { TableActionButton } from "@/ui/shared/components/TableActionButton";
import { ResponsiveCardView, useMobileView } from "@/ui/shared/components/ResponsiveCardView";
import { billingHistoryDeleteErrorMessage } from "./adminPaymentsHistoryDeleteError";
import {
  formatHistoryDateTime,
  formatMoney,
  paymentStatusBadge,
} from "./billingUi";

type Props = {
  t: TFunction;
  admin: AdminService;
  message: { success: (c: string) => void; error: (c: string) => void };
  userMeta: UserBusinessMeta | null;
  rows: BillingHistoryWithAccountRow[];
  loading: boolean;
  revokingId: number | null;
  deletingId: number | null;
  setRevokingId: (id: number | null) => void;
  setDeletingId: (id: number | null) => void;
  refreshBillingFormForAccount: (accountId: number) => Promise<void>;
  loadAllBillingHistory: () => Promise<void>;
  downloadRowPdf: (row: BillingHistoryWithAccountRow) => void;
};

export function AdminPaymentsHistoryTable({
  t,
  admin,
  message,
  userMeta,
  rows,
  loading,
  revokingId,
  deletingId,
  setRevokingId,
  setDeletingId,
  refreshBillingFormForAccount,
  loadAllBillingHistory,
  downloadRowPdf,
}: Props) {
  const isMobile = useMobileView();

  const revokeRow = async (r: BillingHistoryWithAccountRow) => {
    setRevokingId(r.id);
    try {
      await admin.revokeBillingHistoryRow(r.accountId, r.id);
      message.success(t("admin.payments.revokeSuccess"));
      await loadAllBillingHistory();
      if (userMeta?.accountId === r.accountId) {
        await refreshBillingFormForAccount(r.accountId);
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("errors.generic"));
    } finally {
      setRevokingId(null);
    }
  };

  const deleteRow = async (r: BillingHistoryWithAccountRow) => {
    setDeletingId(r.id);
    try {
      await admin.deleteBillingHistoryRow(r.accountId, r.id);
      message.success(t("admin.payments.deleteSuccess"));
      await loadAllBillingHistory();
    } catch (e) {
      message.error(billingHistoryDeleteErrorMessage(t, e));
    } finally {
      setDeletingId(null);
    }
  };

  const confirmRevoke = (r: BillingHistoryWithAccountRow) =>
    confirm({
      title: t("admin.payments.revokeConfirmTitle"),
      content: t("admin.payments.revokeConfirmDesc"),
      okText: t("admin.payments.revokeOk"),
      cancelText: t("common.cancel"),
      danger: true,
      onOk: () => revokeRow(r),
    });

  const confirmDelete = (r: BillingHistoryWithAccountRow) =>
    confirm({
      title: t("admin.payments.deleteConfirmTitle"),
      content: t("admin.payments.deleteConfirmDesc"),
      okText: t("admin.payments.deleteOk"),
      cancelText: t("common.cancel"),
      danger: true,
      onOk: () => deleteRow(r),
    });

  if (isMobile) {
    return (
      <ResponsiveCardView
        items={rows.map((r) => ({
          id: `${r.accountId}-${r.id}`,
          title: r.accountName,
          subtitle: r.ownerEmail || "-",
          description: formatHistoryDateTime(r.createdAt),
          tags: [
            {
              label: r.chargeType === "monthly" ? t("admin.payments.historyTypeMonthly") : t("admin.payments.historyTypeOneTime"),
              color: r.chargeType === "monthly" ? "purple" : "blue",
            },
            paymentStatusBadge(t, r.paymentStatus),
            ...(r.recordStatus !== "active"
              ? [{
                  label: r.recordStatus === "revoked" ? t("admin.payments.historyStatusRevoked") : t("admin.payments.historyStatusSuperseded"),
                  color: "default",
                }]
              : []),
          ],
          extra: (
            <div className="text-end">
              <span className="text-sm font-semibold tabular-nums">
                {r.amount != null ? formatMoney(r.amount, r.currency) : "-"}
              </span>
              {r.chargeType === "monthly" && r.installmentMonths != null && r.installmentMonths >= 2 && r.installmentTotalAmount != null && (
                <span className="block text-[10px] text-muted-foreground">
                  {t("admin.payments.historyInstallmentFootnote", {
                    total: formatMoney(r.installmentTotalAmount, r.currency),
                    months: r.installmentMonths,
                  })}
                </span>
              )}
            </div>
          ),
          actions: [
            {
              label: t("admin.payments.downloadPdf"),
              onClick: () => downloadRowPdf(r),
              icon: <Download className="size-4" />,
              type: "default" as const,
            },
            ...(r.recordStatus === "active"
              ? [{
                  label: t("admin.payments.revoke"),
                  onClick: () => confirmRevoke(r),
                }]
              : [{
                  label: t("admin.payments.deleteRow"),
                  onClick: () => confirmDelete(r),
                  danger: true,
                }]),
          ],
        }))}
        loading={loading}
        emptyText={t("admin.payments.historyEmpty")}
      />
    );
  }

  const columns: DataTableColumn<BillingHistoryWithAccountRow>[] = [
    {
      title: t("admin.payments.historyColCreated"),
      dataIndex: "createdAt",
      width: 132,
      render: (v) => <span className="tabular-nums">{formatHistoryDateTime(v as string)}</span>,
    },
    {
      title: t("admin.payments.colBusiness"),
      key: "biz",
      render: (_, r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold">{r.accountName}</div>
          {r.ownerEmail && (
            <div className="truncate text-xs text-(--ds-text-tertiary)">{r.ownerEmail}</div>
          )}
        </div>
      ),
    },
    {
      title: t("admin.payments.historyColType"),
      dataIndex: "chargeType",
      width: 96,
      render: (ct) =>
        (ct as string) === "monthly" ? (
          <Badge variant="primary">{t("admin.payments.historyTypeMonthly")}</Badge>
        ) : (
          <Badge variant="processing">{t("admin.payments.historyTypeOneTime")}</Badge>
        ),
    },
    {
      title: t("admin.payments.historyColAmount"),
      key: "amount",
      width: 132,
      render: (_, r) => {
        if (r.amount == null) return "-";
        const main = formatMoney(r.amount, r.currency);
        if (
          r.chargeType === "monthly" &&
          r.installmentMonths != null &&
          r.installmentMonths >= 2 &&
          r.installmentTotalAmount != null
        ) {
          return (
            <div>
              <span className="font-semibold tabular-nums">{main}</span>
              <span className="block text-[11px] text-muted-foreground">
                {t("admin.payments.historyInstallmentFootnote", {
                  total: formatMoney(r.installmentTotalAmount, r.currency),
                  months: r.installmentMonths,
                })}
              </span>
            </div>
          );
        }
        return <span className="tabular-nums">{main}</span>;
      },
    },
    {
      title: t("admin.payments.historyColPayment"),
      key: "paymentStatus",
      width: 160,
      render: (_, r) => (
        <div className="flex flex-wrap items-center gap-1">
          {paymentStatusBadge(t, r.paymentStatus)}
          {r.recordStatus === "revoked" && (
            <Badge className="text-[11px]">{t("admin.payments.historyStatusRevoked")}</Badge>
          )}
          {r.recordStatus !== "active" && r.recordStatus !== "revoked" && (
            <Badge className="text-[11px]">{t("admin.payments.historyStatusSuperseded")}</Badge>
          )}
        </div>
      ),
    },
    {
      title: t("admin.payments.historyColActions"),
      key: "actions",
      width: 200,
      render: (_, r) => (
        <div className="flex flex-wrap items-center gap-1">
          <TableActionButton
            tooltip={t("admin.payments.downloadPdf")}
            icon={<Download className="size-4" />}
            onClick={() => downloadRowPdf(r)}
            disabled={r.amount == null || r.amount <= 0}
          />
          {/* Payment link disabled per request */}
          {r.recordStatus === "active" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={revokingId === r.id}
              onClick={() => confirmRevoke(r)}
            >
              {revokingId === r.id ? (
                <Spinner size="sm" className="text-current" aria-hidden="true" />
              ) : (
                <Undo2 aria-hidden="true" />
              )}
              {t("admin.payments.revoke")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:text-destructive"
              disabled={deletingId === r.id}
              onClick={() => confirmDelete(r)}
            >
              {deletingId === r.id ? (
                <Spinner size="sm" className="text-current" aria-hidden="true" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              {t("admin.payments.deleteRow")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable<BillingHistoryWithAccountRow>
      rowKey={(r) => `${r.accountId}-${r.id}`}
      loading={loading}
      size="small"
      pagination={{
        pageSize: 12,
        showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
      }}
      scroll={{ x: 900 }}
      locale={{ emptyText: t("admin.payments.historyEmpty") }}
      dataSource={rows}
      columns={columns}
    />
  );
}

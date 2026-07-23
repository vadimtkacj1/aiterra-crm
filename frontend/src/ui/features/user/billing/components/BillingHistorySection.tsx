import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UserBillingHistoryRow } from "@/services/billing/IBillingService";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/ui/shared/components/EmptyState";
import { ResponsiveCardView, useMobileView } from "@/ui/shared/components/ResponsiveCardView";
import { TableActionButton } from "@/ui/shared/components/TableActionButton";
import { formatInvoiceMoney, fmtDateTime } from "./billingUtils";
import { downloadInvoicePdf } from "@/ui/shared/utils/invoicePdf";

interface Props {
  rows: UserBillingHistoryRow[];
  loading: boolean;
  appLocale: string;
  accountId: string;
}

const STATUS_VARIANT: Record<string, "default" | "primary" | "processing" | "success" | "warning" | "error"> = {
  paid: "success",
  unpaid: "warning",
  ongoing: "processing",
  voided: "default",
  cancelled: "error",
  superseded: "default",
  unknown: "default",
};

function PaymentStatusTag({ status }: { status: UserBillingHistoryRow["paymentStatus"] }) {
  const { t } = useTranslation();
  const labels: Record<string, string> = {
    paid: t("billing.historyStatusPaid"),
    unpaid: t("billing.historyStatusUnpaid"),
    ongoing: t("billing.historyStatusOngoing"),
    voided: t("billing.historyStatusVoided"),
    cancelled: t("billing.historyStatusCancelled"),
    superseded: t("billing.historyStatusSuperseded"),
    unknown: t("billing.historyStatusUnknown"),
  };
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "default"}>
      {labels[status] ?? labels.unknown}
    </Badge>
  );
}

export function BillingHistorySection({ rows, loading, appLocale, accountId }: Props) {
  const { t } = useTranslation();
  const isMobile = useMobileView();

  const downloadRow = (r: UserBillingHistoryRow) => {
    if (!r.amount) return;
    downloadInvoicePdf({
      invoiceId: String(r.id),
      amount: r.amount,
      currency: r.currency,
      status: r.paymentStatus === "paid" ? "paid" : r.paymentStatus,
      description: r.description ?? undefined,
      chargeType: r.chargeType,
      accountId,
      createdAt: r.createdAt,
    });
  };

  const columns: DataTableColumn<UserBillingHistoryRow>[] = [
    {
      title: t("billing.date"),
      dataIndex: "createdAt",
      width: 140,
      render: (v) => <span className="tabular-nums">{fmtDateTime(v as string, appLocale)}</span>,
    },
    {
      title: t("billing.description"),
      dataIndex: "description",
      render: (v) => (
        <span className="block max-w-80 truncate">{(v as string | null) ?? "—"}</span>
      ),
    },
    {
      title: t("billing.historyColType"),
      dataIndex: "chargeType",
      width: 100,
      render: (ct) =>
        (ct as string) === "monthly" ? (
          <Badge variant="primary">{t("billing.chargeTypeMonthly")}</Badge>
        ) : (
          <Badge variant="processing">{t("billing.chargeTypeOneTime")}</Badge>
        ),
    },
    {
      title: t("billing.amount"),
      key: "amount",
      width: 120,
      render: (_, r) => {
        if (r.amount == null) return "—";
        const main = formatInvoiceMoney(r.amount, r.currency, appLocale);
        if (r.chargeType === "monthly" && r.installmentMonths && r.installmentMonths >= 2 && r.installmentTotalAmount) {
          return (
            <div>
              <span className="font-semibold tabular-nums">{main}</span>
              <span className="block text-[11px] text-muted-foreground">
                {t("billing.historyInstallmentNote", {
                  total: formatInvoiceMoney(r.installmentTotalAmount, r.currency, appLocale),
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
      title: t("billing.status"),
      dataIndex: "paymentStatus",
      width: 110,
      render: (s) => <PaymentStatusTag status={s as UserBillingHistoryRow["paymentStatus"]} />,
    },
    {
      title: "",
      key: "actions",
      width: 52,
      render: (_, r) =>
        r.amount ? (
          <TableActionButton
            tooltip={t("billing.downloadPdf")}
            icon={<Download aria-hidden="true" />}
            onClick={() => downloadRow(r)}
          />
        ) : null,
    },
  ];

  return (
    <Card className="rounded-xl border-(--ds-border-subtle) shadow-(--ds-shadow-card)">
      <div className="border-b border-(--ds-border-subtle) px-4 py-3">
        <span className="text-[15px] font-semibold">{t("billing.historyCardTitle")}</span>
      </div>
      {loading && !isMobile ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : isMobile ? (
        <div className="p-3">
          <ResponsiveCardView
            items={rows.map((r) => ({
              id: String(r.id),
              title: r.description ?? `#${r.id}`,
              subtitle: fmtDateTime(r.createdAt, appLocale),
              tags: [
                {
                  label: r.chargeType === "monthly" ? t("billing.chargeTypeMonthly") : t("billing.chargeTypeOneTime"),
                  color: r.chargeType === "monthly" ? "purple" : "blue",
                },
                {
                  label: (() => {
                    const labels: Record<string, string> = {
                      paid: t("billing.historyStatusPaid"),
                      unpaid: t("billing.historyStatusUnpaid"),
                      ongoing: t("billing.historyStatusOngoing"),
                      voided: t("billing.historyStatusVoided"),
                      cancelled: t("billing.historyStatusCancelled"),
                      superseded: t("billing.historyStatusSuperseded"),
                      unknown: t("billing.historyStatusUnknown"),
                    };
                    return labels[r.paymentStatus] ?? r.paymentStatus;
                  })(),
                  color: r.paymentStatus === "paid" ? "success" : r.paymentStatus === "unpaid" ? "warning" : r.paymentStatus === "ongoing" ? "processing" : r.paymentStatus === "cancelled" ? "error" : "default",
                },
              ],
              extra: r.amount != null ? (
                <span className="text-sm font-semibold tabular-nums">
                  {formatInvoiceMoney(r.amount, r.currency, appLocale)}
                </span>
              ) : undefined,
              actions: r.amount
                ? [{ label: "PDF", onClick: () => downloadRow(r), icon: <Download aria-hidden="true" />, type: "default" as const }]
                : [],
            }))}
            loading={loading}
            emptyText={t("billing.historyEmpty")}
          />
        </div>
      ) : (
        <DataTable<UserBillingHistoryRow>
          rowKey="id"
          scroll={{ x: 560 }}
          pagination={{ pageSize: 8 }}
          dataSource={rows}
          locale={{
            emptyText: <EmptyState title={t("billing.historyEmpty")} style={{ padding: "24px 16px" }} />,
          }}
          columns={columns}
        />
      )}
    </Card>
  );
}

import type { TFunction } from "i18next";
import type { SubscriptionPayment } from "@/services/admin/AdminService";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatDateTime, formatMoney, getPaymentStatusColor } from "@/ui/shared/utils/subscriptionUtils";

interface Props {
  payments: SubscriptionPayment[];
  t: TFunction;
}

export function SubscriptionPaymentHistory({ payments, t }: Props) {
  const columns: DataTableColumn<SubscriptionPayment>[] = [
    {
      title: "#",
      dataIndex: "payment_number",
      key: "payment_number",
      width: 60,
      render: (num) => <span className="font-semibold tabular-nums">#{num as number}</span>,
    },
    {
      title: t("admin.contracts.subscription.amount"),
      key: "amount",
      render: (_, r) => <span className="tabular-nums">{formatMoney(r.amount, r.currency)}</span>,
    },
    {
      title: t("admin.contracts.subscription.status"),
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Badge variant={getPaymentStatusColor(status as string) as BadgeProps["variant"]}>
          {t(`admin.contracts.subscription.payState.${status as string}`, { defaultValue: status as string })}
        </Badge>
      ),
    },
    {
      title: t("admin.contracts.subscription.paidAt"),
      dataIndex: "paid_at",
      key: "paid_at",
      render: (date) => <span className="tabular-nums">{formatDateTime(date as string)}</span>,
    },
    {
      title: t("admin.contracts.subscription.transactionId"),
      dataIndex: "zcredit_transaction_id",
      key: "zcredit_transaction_id",
      render: (id) => (
        <span className="text-xs text-muted-foreground">{(id as string | null) || "-"}</span>
      ),
    },
  ];

  return (
    <div>
      <h5 className="mb-3 mt-0 text-base font-semibold">
        {t("admin.contracts.subscription.paymentHistory")}
      </h5>
      <DataTable<SubscriptionPayment>
        dataSource={payments}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: t("admin.contracts.subscription.noPayments") }}
      />
    </div>
  );
}

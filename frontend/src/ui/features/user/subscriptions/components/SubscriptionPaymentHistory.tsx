import { Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TFunction } from "i18next";
import type { SubscriptionPayment } from "@/services/admin/AdminService";
import { formatDateTime, formatMoney, getPaymentStatusColor } from "@/ui/shared/utils/subscriptionUtils";
import { Tag } from "antd";

interface Props {
  payments: SubscriptionPayment[];
  t: TFunction;
}

export function SubscriptionPaymentHistory({ payments, t }: Props) {
  const columns: ColumnsType<SubscriptionPayment> = [
    {
      title: "#",
      dataIndex: "payment_number",
      key: "payment_number",
      width: 60,
      render: (num: number) => <Typography.Text strong>#{num}</Typography.Text>,
    },
    {
      title: t("admin.contracts.subscription.amount"),
      key: "amount",
      render: (_, r) => formatMoney(r.amount, r.currency),
    },
    {
      title: t("admin.contracts.subscription.status"),
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={getPaymentStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: t("admin.contracts.subscription.paidAt"),
      dataIndex: "paid_at",
      key: "paid_at",
      render: (date: string) => formatDateTime(date),
    },
    {
      title: t("admin.contracts.subscription.transactionId"),
      dataIndex: "zcredit_transaction_id",
      key: "zcredit_transaction_id",
      render: (id: string | null) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {id || "-"}
        </Typography.Text>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={5} style={{ marginBottom: 12 }}>
        {t("admin.contracts.subscription.paymentHistory")}
      </Typography.Title>
      <Table
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

import { CalendarOutlined, CheckCircleOutlined, DollarOutlined } from "@ant-design/icons";
import { Descriptions, Space, Tag, Typography, theme } from "antd";
import type { TFunction } from "i18next";
import type { SubscriptionStatus } from "@/services/admin/AdminService";
import { formatDate, formatMoney, getSubscriptionStatusColor } from "@/ui/shared/utils/subscriptionUtils";

interface Props {
  status: SubscriptionStatus;
  t: TFunction;
}

export function SubscriptionOverview({ status, t }: Props) {
  const { token } = theme.useToken();
  const rawState = status.subscription_status;
  const subState = rawState === "canceled" ? "cancelled" : rawState;

  return (
    <Descriptions column={2} bordered size="small">
      <Descriptions.Item label={t("admin.contracts.subscription.contractTitle")} span={2}>
        <Typography.Text strong>{status.contract_title}</Typography.Text>
      </Descriptions.Item>
      <Descriptions.Item label={t("admin.contracts.subscription.monthlyAmount")}>
        <Typography.Text strong style={{ fontSize: 16 }}>
          {formatMoney(status.monthly_amount, status.currency)}
        </Typography.Text>
      </Descriptions.Item>
      <Descriptions.Item label={t("admin.contracts.subscription.duration")}>
        {status.subscription_months ? (
          <Tag color="blue">
            {status.subscription_months} {t("admin.contracts.subscription.months")}
          </Tag>
        ) : (
          <Tag color="purple">{t("admin.contracts.subscription.unlimited")}</Tag>
        )}
      </Descriptions.Item>
      <Descriptions.Item label={t("admin.contracts.subscription.startedAt")}>
        {status.started_at ? formatDate(status.started_at) : "-"}
      </Descriptions.Item>
      <Descriptions.Item label={t("admin.contracts.subscription.nextPayment")}>
        {status.next_payment_date ? (
          <Tag color="green" icon={<CalendarOutlined />}>
            {formatDate(status.next_payment_date)}
          </Tag>
        ) : (
          "-"
        )}
      </Descriptions.Item>
      <Descriptions.Item label={t("admin.contracts.subscription.paymentsMade")}>
        <Space>
          <Tag color="success" icon={<CheckCircleOutlined />}>
            {status.payments_made}
          </Tag>
          {status.payments_remaining !== null && (
            <Typography.Text type="secondary">
              / {status.payments_made + status.payments_remaining} {t("admin.contracts.subscription.total")}
            </Typography.Text>
          )}
        </Space>
      </Descriptions.Item>
      <Descriptions.Item label={t("admin.contracts.subscription.totalPaid")}>
        <Typography.Text strong style={{ fontSize: 16, color: token.colorSuccess }}>
          <DollarOutlined /> {formatMoney(status.total_paid, status.currency)}
        </Typography.Text>
      </Descriptions.Item>
      <Descriptions.Item label={t("admin.contracts.subscription.subscriptionStatus")}>
        <Tag color={getSubscriptionStatusColor(subState)}>
          {subState
            ? t(`admin.contracts.subscription.state${subState.charAt(0).toUpperCase()}${subState.slice(1)}`, {
                defaultValue: t("admin.contracts.subscription.stateUnknown"),
              })
            : t("admin.contracts.subscription.stateUnknown")}
        </Tag>
      </Descriptions.Item>
    </Descriptions>
  );
}

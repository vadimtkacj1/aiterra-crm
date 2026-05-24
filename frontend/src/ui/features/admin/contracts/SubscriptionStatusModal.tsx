import { CalendarOutlined } from "@ant-design/icons";
import { Button, Space, Spin } from "antd";
import { AppModal } from "@/ui/shared/components/AppModal";
import { useTranslation } from "react-i18next";
import { SubscriptionOverview } from "../../user/subscriptions/components/SubscriptionOverview";
import { SubscriptionPaymentHistory } from "../../user/subscriptions/components/SubscriptionPaymentHistory";
import { SubscriptionTestMode } from "../../user/subscriptions/components/SubscriptionTestMode";
import { useSubscriptionStatus } from "../../user/subscriptions/hooks/useSubscriptionStatus";

interface Props {
  contractId: number | null;
  onClose: () => void;
}

export function SubscriptionStatusModal({ contractId, onClose }: Props) {
  const { t } = useTranslation();
  const { status, loading, simulating, simulatePayment } = useSubscriptionStatus(contractId);

  return (
    <AppModal
      open={contractId !== null}
      onCancel={onClose}
      width={900}
      title={
        <Space>
          <CalendarOutlined />
          {t("admin.contracts.subscription.title")}
        </Space>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          {t("common.close")}
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        {status && (
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            <SubscriptionOverview status={status} t={t} />

            <SubscriptionTestMode
              onSimulate={() => void simulatePayment()}
              loading={simulating}
              disabled={status.payments_remaining === 0}
              t={t}
            />

            <SubscriptionPaymentHistory
              payments={status.payments}
              t={t}
            />
          </Space>
        )}
      </Spin>
    </AppModal>
  );
}

import { ThunderboltOutlined } from "@ant-design/icons";
import { Alert, Button } from "antd";
import type { TFunction } from "i18next";

interface Props {
  onSimulate: () => void;
  loading: boolean;
  disabled: boolean;
  t: TFunction;
}

export function SubscriptionTestMode({ onSimulate, loading, disabled, t }: Props) {
  return (
    <Alert
      type="info"
      showIcon
      icon={<ThunderboltOutlined />}
      message={t("admin.contracts.subscription.testMode")}
      description={t("admin.contracts.subscription.testModeDesc")}
      action={
        <Button
          size="small"
          type="primary"
          loading={loading}
          onClick={onSimulate}
          disabled={disabled}
        >
          {t("admin.contracts.subscription.simulatePayment")}
        </Button>
      }
    />
  );
}

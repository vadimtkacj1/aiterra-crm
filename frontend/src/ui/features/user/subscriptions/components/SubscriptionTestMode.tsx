import { Zap } from "lucide-react";
import type { TFunction } from "i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  onSimulate: () => void;
  loading: boolean;
  disabled: boolean;
  t: TFunction;
}

export function SubscriptionTestMode({ onSimulate, loading, disabled, t }: Props) {
  return (
    <Alert
      variant="info"
      icon={<Zap aria-hidden="true" />}
      title={t("admin.contracts.subscription.testMode")}
      description={t("admin.contracts.subscription.testModeDesc")}
    >
      <div className="mt-2">
        <Button size="sm" onClick={onSimulate} disabled={disabled || loading}>
          {loading && <Spinner size="sm" className="text-current" aria-hidden="true" />}
          {t("admin.contracts.subscription.simulatePayment")}
        </Button>
      </div>
    </Alert>
  );
}

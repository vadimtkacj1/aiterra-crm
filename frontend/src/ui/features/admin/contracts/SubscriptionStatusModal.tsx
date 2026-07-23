import { Ban, Calendar, PauseCircle, PlayCircle, Save, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputNumber } from "@/components/ui/input-number";
import { Spinner } from "@/components/ui/spinner";
import { confirm } from "@/lib/confirm";
import { AppModal } from "@/ui/shared/components/AppModal";
import { useMobileView } from "@/ui/shared/components/ResponsiveCardView";
import { SubscriptionOverview } from "../../user/subscriptions/components/SubscriptionOverview";
import { useSubscriptionStatus } from "../../user/subscriptions/hooks/useSubscriptionStatus";

interface Props {
  contractId: number | null;
  onClose: () => void;
}

export function SubscriptionStatusModal({ contractId, onClose }: Props) {
  const { t } = useTranslation();
  const isMobile = useMobileView();
  const {
    status,
    loading,
    simulating,
    updatingBillingDay,
    pausingOrResuming,
    cancelling,
    settingTestInterval,
    simulatePayment,
    updateBillingDay,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    setTestInterval,
  } = useSubscriptionStatus(contractId);

  const [pendingDay, setPendingDay] = useState<number | null | undefined>(undefined);
  const [testMinutes, setTestMinutes] = useState<number | null>(null);

  const currentDay = pendingDay !== undefined ? pendingDay : (status?.billing_day ?? null);
  const dayChanged = pendingDay !== undefined && pendingDay !== (status?.billing_day ?? null);

  const handleSaveBillingDay = () => {
    void updateBillingDay(currentDay).then(() => setPendingDay(undefined));
  };

  const rawState = status?.subscription_status;
  const subState = rawState === "canceled" ? "cancelled" : rawState;
  const isActive = subState === "active";
  const isPaused = subState === "paused";
  const isCancelled = subState === "cancelled";
  const isPending = subState === "pending";
  const hasTestInterval = !!status?.test_interval_minutes;

  const handleStartTest = () => {
    const mins = testMinutes ?? 10;
    void setTestInterval(mins).then(() => setTestMinutes(null));
  };

  const handleStopTest = () => {
    void setTestInterval(null);
  };

  const handleCancel = () => {
    confirm({
      title: t("admin.contracts.subscription.cancelConfirmTitle"),
      content: t("admin.contracts.subscription.cancelConfirmContent"),
      danger: true,
      okText: t("admin.contracts.subscription.cancelConfirmOk"),
      cancelText: t("admin.contracts.subscription.cancelConfirmKeep"),
      onOk: () => void cancelSubscription(),
    });
  };

  // Flat sections separated by a hairline divider — no nested boxes.
  const sectionClass = "border-t border-(--ds-border-subtle) pt-4";

  return (
    <AppModal
      open={contractId !== null}
      onCancel={onClose}
      width={isMobile ? "100%" : 800}
      styles={isMobile ? { body: { maxHeight: "70vh", overflowY: "auto" } } : undefined}
      title={
        <span className="flex items-center gap-2">
          <Calendar aria-hidden="true" className="size-4" />
          {t("admin.contracts.subscription.title")}
        </span>
      }
      footer={[
        <Button key="close" variant="outline" onClick={onClose}>
          {t("common.close")}
        </Button>,
      ]}
    >
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex min-h-24 items-center justify-center bg-background/60">
            <Spinner />
          </div>
        )}
        {status && (
          <div className="flex w-full flex-col gap-4">
            <SubscriptionOverview status={status} t={t} />

            {/* ── Charge day ── */}
            <div className={sectionClass}>
              <span className="mb-2.5 block text-[13px] font-semibold">
                {t("admin.contracts.form.billingDay")}
              </span>
              <div className={`flex flex-wrap items-center gap-2 ${isMobile ? "w-full" : ""}`}>
                <InputNumber
                  min={1}
                  max={28}
                  precision={0}
                  value={currentDay}
                  onChange={(v) => setPendingDay(v ?? null)}
                  placeholder="1–28"
                  className="w-24"
                />
                <Button
                  size="sm"
                  disabled={!dayChanged || updatingBillingDay}
                  onClick={handleSaveBillingDay}
                  className={isMobile ? "w-full" : undefined}
                >
                  {updatingBillingDay ? (
                    <Spinner size="sm" className="text-current" aria-hidden="true" />
                  ) : (
                    <Save aria-hidden="true" />
                  )}
                  {t("common.save")}
                </Button>
              </div>
              <span className="mt-1.5 block text-xs text-muted-foreground">
                {t("admin.contracts.subscription.billingBlankHint")}
              </span>
            </div>

            {/* ── Test mode (only when activated) ── */}
            {!isPending && !isCancelled && (
              <div className={sectionClass}>
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <Zap aria-hidden="true" className="size-4 text-(--ds-color-warning)" />
                  <span className="text-[13px] font-semibold">
                    {t("admin.contracts.subscription.testMode")}
                  </span>
                  {hasTestInterval && (
                    <Badge variant="warning">
                      {t("admin.contracts.subscription.testEvery", { minutes: status.test_interval_minutes })}
                    </Badge>
                  )}
                </div>

                <span className="mb-2.5 block text-xs text-muted-foreground">
                  {t("admin.contracts.subscription.testModeDesc")}
                </span>

                {hasTestInterval ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={simulating || status.payments_remaining === 0}
                      onClick={() => void simulatePayment()}
                    >
                      {simulating ? (
                        <Spinner size="sm" className="text-current" aria-hidden="true" />
                      ) : (
                        <PlayCircle aria-hidden="true" />
                      )}
                      {t("admin.contracts.subscription.simulateNow")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:text-destructive"
                      disabled={settingTestInterval}
                      onClick={handleStopTest}
                    >
                      {settingTestInterval ? (
                        <Spinner size="sm" className="text-current" aria-hidden="true" />
                      ) : (
                        <Ban aria-hidden="true" />
                      )}
                      {t("admin.contracts.subscription.stopTest")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <InputNumber
                      min={1}
                      max={1440}
                      precision={0}
                      value={testMinutes}
                      onChange={(v) => setTestMinutes(v ?? null)}
                      placeholder="10"
                      suffix={t("admin.contracts.subscription.minUnit")}
                      className="w-32"
                    />
                    <Button
                      size="sm"
                      disabled={settingTestInterval}
                      onClick={handleStartTest}
                    >
                      {settingTestInterval ? (
                        <Spinner size="sm" className="text-current" aria-hidden="true" />
                      ) : (
                        <Zap aria-hidden="true" />
                      )}
                      {t("admin.contracts.subscription.startTest")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={simulating || status.payments_remaining === 0}
                      onClick={() => void simulatePayment()}
                    >
                      {simulating && (
                        <Spinner size="sm" className="text-current" aria-hidden="true" />
                      )}
                      {t("admin.contracts.subscription.oneTimeSimulate")}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── Subscription controls ── */}
            {!isPending && (
              <div className={sectionClass}>
                <span className="mb-2.5 block text-[13px] font-semibold">
                  {t("admin.contracts.subscription.controls")}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {isActive && (
                    <Button
                      variant="outline"
                      disabled={pausingOrResuming}
                      onClick={() => void pauseSubscription()}
                    >
                      {pausingOrResuming ? (
                        <Spinner size="sm" className="text-current" aria-hidden="true" />
                      ) : (
                        <PauseCircle aria-hidden="true" />
                      )}
                      {t("admin.contracts.subscription.pause")}
                    </Button>
                  )}
                  {isPaused && (
                    <Button
                      disabled={pausingOrResuming}
                      onClick={() => void resumeSubscription()}
                    >
                      {pausingOrResuming ? (
                        <Spinner size="sm" className="text-current" aria-hidden="true" />
                      ) : (
                        <PlayCircle aria-hidden="true" />
                      )}
                      {t("admin.contracts.subscription.resume")}
                    </Button>
                  )}
                  {!isCancelled && (
                    <Button
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:text-destructive"
                      disabled={cancelling}
                      onClick={handleCancel}
                    >
                      {cancelling ? (
                        <Spinner size="sm" className="text-current" aria-hidden="true" />
                      ) : (
                        <Ban aria-hidden="true" />
                      )}
                      {t("admin.contracts.subscription.cancel")}
                    </Button>
                  )}
                  {isCancelled && (
                    <Badge variant="error" className="px-2.5 py-1 text-[13px]">
                      {t("admin.contracts.subscription.cancelled")}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppModal>
  );
}

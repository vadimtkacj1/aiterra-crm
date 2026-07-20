import {
  CalendarOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { App, Button, Col, Grid, InputNumber, Row, Space, Spin, Tag, Typography } from "antd";
import { useState } from "react";
import { AppModal } from "@/ui/shared/components/AppModal";
import { useTranslation } from "react-i18next";
import { SubscriptionOverview } from "../../user/subscriptions/components/SubscriptionOverview";
import { useSubscriptionStatus } from "../../user/subscriptions/hooks/useSubscriptionStatus";

interface Props {
  contractId: number | null;
  onClose: () => void;
}

export function SubscriptionStatusModal({ contractId, onClose }: Props) {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
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

  const isActive = status?.subscription_status === "active";
  const isPaused = status?.subscription_status === "paused";
  const isCancelled = status?.subscription_status === "cancelled";
  const isPending = status?.subscription_status === "pending";
  const hasTestInterval = !!status?.test_interval_minutes;

  const handleStartTest = () => {
    const mins = testMinutes ?? 10;
    void setTestInterval(mins).then(() => setTestMinutes(null));
  };

  const handleStopTest = () => {
    void setTestInterval(null);
  };

  const handleCancel = () => {
    modal.confirm({
      title: t("admin.contracts.subscription.cancelConfirmTitle"),
      content: t("admin.contracts.subscription.cancelConfirmContent"),
      okType: "danger",
      okText: t("admin.contracts.subscription.cancelConfirmOk"),
      cancelText: t("common.cancel"),
      onOk: () => void cancelSubscription(),
    });
  };

  // Flat sections separated by a hairline divider — no nested boxes.
  const sectionStyle = {
    paddingTop: 16,
    borderTop: "1px solid var(--ds-border-subtle)",
  };

  return (
    <AppModal
      open={contractId !== null}
      onCancel={onClose}
      width={isMobile ? "100%" : 800}
      styles={isMobile ? { body: { maxHeight: "70vh", overflowY: "auto" } } : undefined}
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
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <SubscriptionOverview status={status} t={t} />

            {/* ── Charge day ── */}
            <div style={sectionStyle}>
              <Typography.Text strong style={{ display: "block", marginBottom: 10, fontSize: 13 }}>
                {t("admin.contracts.form.billingDay")}
              </Typography.Text>
              <Space align="center" wrap style={{ width: isMobile ? "100%" : "auto" }}>
                <InputNumber
                  min={1}
                  max={28}
                  value={currentDay ?? undefined}
                  onChange={(v) => setPendingDay(v ?? null)}
                  placeholder="1–28"
                  style={{ width: 100 }}
                  controls
                />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t("admin.contracts.subscription.dayOfMonthSuffix")}
                </Typography.Text>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={updatingBillingDay}
                  disabled={!dayChanged}
                  onClick={handleSaveBillingDay}
                  size="small"
                  block={isMobile}
                >
                  {t("common.save")}
                </Button>
              </Space>
              <Typography.Text type="secondary" style={{ display: "block", marginTop: 6, fontSize: 12 }}>
                {t("admin.contracts.subscription.billingBlankHint")}
              </Typography.Text>
            </div>

            {/* ── Test mode (only when activated) ── */}
            {!isPending && !isCancelled && (
              <div style={sectionStyle}>
                <Space style={{ marginBottom: 10 }}>
                  <ThunderboltOutlined style={{ color: "var(--ds-color-warning)" }} />
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {t("admin.contracts.subscription.testMode")}
                  </Typography.Text>
                  {hasTestInterval && (
                    <Tag color="warning">
                      {t("admin.contracts.subscription.testEvery", { minutes: status.test_interval_minutes })}
                    </Tag>
                  )}
                </Space>

                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 10, fontSize: 12 }}>
                  {t("admin.contracts.subscription.testModeDesc")}
                </Typography.Text>

                {hasTestInterval ? (
                  <Space wrap>
                    <Button
                      icon={<PlayCircleOutlined />}
                      loading={simulating}
                      onClick={() => void simulatePayment()}
                      disabled={status.payments_remaining === 0}
                      size="small"
                    >
                      {t("admin.contracts.subscription.simulateNow")}
                    </Button>
                    <Button
                      danger
                      icon={<StopOutlined />}
                      loading={settingTestInterval}
                      onClick={handleStopTest}
                      size="small"
                    >
                      {t("admin.contracts.subscription.stopTest")}
                    </Button>
                  </Space>
                ) : (
                  <Row gutter={8} align="middle">
                    <Col>
                      <InputNumber
                        min={1}
                        max={1440}
                        value={testMinutes ?? undefined}
                        onChange={(v) => setTestMinutes(v ?? null)}
                        placeholder="10"
                        addonAfter={t("admin.contracts.subscription.minUnit")}
                        style={{ width: 130 }}
                      />
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        loading={settingTestInterval}
                        onClick={handleStartTest}
                        size="small"
                      >
                        {t("admin.contracts.subscription.startTest")}
                      </Button>
                    </Col>
                    <Col>
                      <Button
                        loading={simulating}
                        onClick={() => void simulatePayment()}
                        disabled={status.payments_remaining === 0}
                        size="small"
                      >
                        {t("admin.contracts.subscription.oneTimeSimulate")}
                      </Button>
                    </Col>
                  </Row>
                )}
              </div>
            )}

            {/* ── Subscription controls ── */}
            {!isPending && (
              <div style={sectionStyle}>
                <Typography.Text strong style={{ display: "block", marginBottom: 10, fontSize: 13 }}>
                  {t("admin.contracts.subscription.controls")}
                </Typography.Text>
                <Space wrap>
                  {isActive && (
                    <Button
                      icon={<PauseCircleOutlined />}
                      loading={pausingOrResuming}
                      onClick={() => void pauseSubscription()}
                    >
                      {t("admin.contracts.subscription.pause")}
                    </Button>
                  )}
                  {isPaused && (
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      loading={pausingOrResuming}
                      onClick={() => void resumeSubscription()}
                    >
                      {t("admin.contracts.subscription.resume")}
                    </Button>
                  )}
                  {!isCancelled && (
                    <Button
                      danger
                      icon={<StopOutlined />}
                      loading={cancelling}
                      onClick={handleCancel}
                    >
                      {t("admin.contracts.subscription.cancel")}
                    </Button>
                  )}
                  {isCancelled && (
                    <Tag color="red" style={{ fontSize: 13, padding: "4px 10px" }}>
                      {t("admin.contracts.subscription.cancelled")}
                    </Tag>
                  )}
                </Space>
              </div>
            )}
          </Space>
        )}
      </Spin>
    </AppModal>
  );
}

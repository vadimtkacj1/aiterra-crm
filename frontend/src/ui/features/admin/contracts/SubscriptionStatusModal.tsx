import {
  CalendarOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Button, Col, InputNumber, Modal, Row, Space, Spin, Tag, Typography } from "antd";
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
    Modal.confirm({
      title: "Cancel subscription?",
      content: "This will stop all future charges. This action cannot be undone.",
      okType: "danger",
      okText: "Yes, cancel",
      onOk: () => void cancelSubscription(),
    });
  };

  const sectionStyle = {
    padding: "14px 16px",
    background: "var(--ds-surface-1, #f8fafc)",
    border: "1px solid var(--ds-border-subtle, #e2e8f0)",
    borderRadius: 8,
  };

  return (
    <AppModal
      open={contractId !== null}
      onCancel={onClose}
      width={800}
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
              <Space align="center">
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
                  day of month
                </Typography.Text>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={updatingBillingDay}
                  disabled={!dayChanged}
                  onClick={handleSaveBillingDay}
                  size="small"
                >
                  {t("common.save")}
                </Button>
              </Space>
              <Typography.Text type="secondary" style={{ display: "block", marginTop: 6, fontSize: 12 }}>
                Leave blank to charge on the signup date.
              </Typography.Text>
            </div>

            {/* ── Test mode (only when activated) ── */}
            {!isPending && !isCancelled && (
              <div
                style={{
                  ...sectionStyle,
                  background: "var(--ds-color-warning-surface, #fffbe6)",
                  border: "1px solid var(--ds-color-warning-border, #ffe58f)",
                }}
              >
                <Space style={{ marginBottom: 10 }}>
                  <ThunderboltOutlined style={{ color: "#faad14" }} />
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    Test mode
                  </Typography.Text>
                  {hasTestInterval && (
                    <Tag color="orange">Every {status.test_interval_minutes} min</Tag>
                  )}
                </Space>

                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 10, fontSize: 12 }}>
                  Charge this subscription automatically every N minutes instead of monthly. Requires{" "}
                  <code>SUBSCRIPTION_BILLING_TEST_ENABLED=true</code> in backend env.
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
                      Simulate now
                    </Button>
                    <Button
                      danger
                      icon={<StopOutlined />}
                      loading={settingTestInterval}
                      onClick={handleStopTest}
                      size="small"
                    >
                      Stop test
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
                        addonAfter="min"
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
                        Start test
                      </Button>
                    </Col>
                    <Col>
                      <Button
                        loading={simulating}
                        onClick={() => void simulatePayment()}
                        disabled={status.payments_remaining === 0}
                        size="small"
                      >
                        One-time simulate
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
                  Subscription controls
                </Typography.Text>
                <Space wrap>
                  {isActive && (
                    <Button
                      icon={<PauseCircleOutlined />}
                      loading={pausingOrResuming}
                      onClick={() => void pauseSubscription()}
                    >
                      Pause
                    </Button>
                  )}
                  {isPaused && (
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      loading={pausingOrResuming}
                      onClick={() => void resumeSubscription()}
                    >
                      Resume
                    </Button>
                  )}
                  {!isCancelled && (
                    <Button
                      danger
                      icon={<StopOutlined />}
                      loading={cancelling}
                      onClick={handleCancel}
                    >
                      Cancel subscription
                    </Button>
                  )}
                  {isCancelled && (
                    <Tag color="red" style={{ fontSize: 13, padding: "4px 10px" }}>
                      Subscription cancelled
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

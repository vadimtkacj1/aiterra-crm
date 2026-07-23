import {
  CheckCircleOutlined,
  DollarOutlined,
  FacebookOutlined,
  PauseCircleOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Badge, Col, Flex, Row, Table, Tag, Typography } from "antd";
import { Card } from "antd";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { MetaAccountBilling } from "@/domain/CampaignAnalytics";
import { billingShell, fmtDateTime, formatInvoiceMoney, statusColor } from "./billingUtils";

interface Props {
  metaBilling: MetaAccountBilling | null;
  metaLoading: boolean;
  appLocale: string;
}

/** §3 stat block: caps-XS muted label, bold tabular value, subtle muted icon.
 *  Borderless on purpose — it lives inside the section card (no card-in-card). */
function MetaStat({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <Flex justify="space-between" align="flex-start" gap={12} style={{ minHeight: 64 }}>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--ds-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "var(--ds-letter-spacing-caps, 0.07em)",
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.15,
            marginTop: 6,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </div>
      </div>
      {icon ? (
        <span aria-hidden style={{ flexShrink: 0, fontSize: 18, lineHeight: 1, color: "var(--ds-text-tertiary)", marginBlockStart: 2 }}>
          {icon}
        </span>
      ) : null}
    </Flex>
  );
}

export function MetaBillingCard({ metaBilling, metaLoading, appLocale }: Props) {
  const { t } = useTranslation();

  if (!metaBilling && !metaLoading) return null;

  return (
    <Card
      title={
        <span>
          <FacebookOutlined style={{ color: "#1877f2", marginInlineEnd: 8 }} />
          {t("billing.metaTitle")}
        </span>
      }
      loading={metaLoading}
      size="small"
      variant="borderless"
      styles={{ header: { borderBottom: `1px solid ${billingShell.borderInner}` } }}
      style={{
        borderRadius: billingShell.radiusMd,
        boxShadow: billingShell.shadow,
        border: `1px solid ${billingShell.borderInner}`,
      }}
      extra={
        metaBilling && (
          <Badge
            status={metaBilling.accountStatus === "ACTIVE" ? "success" : "error"}
            text={metaBilling.accountStatus}
          />
        )
      }
    >
      {metaBilling && (
        <Flex vertical gap={16} style={{ width: "100%" }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <MetaStat
                label={t("billing.metaAmountSpent")}
                value={formatInvoiceMoney(metaBilling.amountSpent, metaBilling.currency, appLocale)}
                icon={<DollarOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <MetaStat
                label={t("billing.metaBalance")}
                value={formatInvoiceMoney(metaBilling.balance, metaBilling.currency, appLocale)}
                icon={<WalletOutlined />}
              />
            </Col>
            {metaBilling.spendCap > 0 && (
              <Col xs={24} sm={12} lg={6}>
                <MetaStat
                  label={t("billing.metaSpendCap")}
                  value={formatInvoiceMoney(metaBilling.spendCap, metaBilling.currency, appLocale)}
                  icon={<PauseCircleOutlined />}
                />
              </Col>
            )}
            <Col xs={24} sm={12} lg={6}>
              <Flex vertical gap={6} style={{ minHeight: 64 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t("billing.metaAccount")}:{" "}
                  <Typography.Text style={{ fontSize: 12 }}>{metaBilling.accountName}</Typography.Text>
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t("billing.metaFunding")}:{" "}
                  <CheckCircleOutlined style={{ color: "var(--ds-color-success)", marginInlineEnd: 4 }} />
                  <Typography.Text style={{ fontSize: 12 }}>{metaBilling.fundingSource}</Typography.Text>
                </Typography.Text>
              </Flex>
            </Col>
          </Row>

          <div style={{ borderTop: `1px solid ${billingShell.borderInner}`, marginInline: -12 }}>
            <Typography.Text
              strong
              style={{ display: "block", fontSize: 13, padding: "12px 12px 4px" }}
            >
              {t("billing.metaTransactions")}
            </Typography.Text>
            {metaBilling.transactions.length === 0 ? (
              <Typography.Text type="secondary" style={{ padding: 12, display: "block" }}>
                {t("billing.metaNoTransactions")}
              </Typography.Text>
            ) : (
              <Table
                size="middle"
                rowKey="id"
                scroll={{ x: 500 }}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                dataSource={metaBilling.transactions}
                columns={[
                  {
                    title: t("billing.date"),
                    dataIndex: "time",
                    key: "time",
                    width: 160,
                    render: (value: string) => (
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtDateTime(value, appLocale)}</span>
                    ),
                  },
                  {
                    title: t("billing.metaTxType"),
                    dataIndex: "txType",
                    key: "type",
                    width: 100,
                    render: (s: string) => <Tag color={s === "REFUND" ? "blue" : "default"}>{s}</Tag>,
                  },
                  {
                    title: t("billing.amount"),
                    key: "amount",
                    width: 120,
                    render: (_, r: MetaAccountBilling["transactions"][number]) => (
                      <Typography.Text
                        strong
                        style={{
                          fontVariantNumeric: "tabular-nums",
                          color: r.txType === "REFUND" ? "var(--ds-color-info)" : undefined,
                        }}
                      >
                        {r.txType === "REFUND" ? "+" : ""}
                        {r.amount.toFixed(2)} {r.currency}
                      </Typography.Text>
                    ),
                  },
                  {
                    title: t("billing.status"),
                    dataIndex: "status",
                    key: "status",
                    width: 100,
                    render: (s: string) => <Tag color={statusColor(s)}>{s}</Tag>,
                  },
                ]}
              />
            )}
          </div>
        </Flex>
      )}
    </Card>
  );
}

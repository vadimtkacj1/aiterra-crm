import {
  CheckCircleOutlined,
  DollarOutlined,
  FacebookOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Badge, Col, Descriptions, Flex, Row, Statistic, Table, Tag, Typography } from "antd";
import { Card } from "antd";
import { useTranslation } from "react-i18next";
import type { MetaAccountBilling } from "../../../../domain/CampaignAnalytics";
import { billingShell, fmtDateTime, statusColor } from "./billingUtils";

interface Props {
  metaBilling: MetaAccountBilling | null;
  metaLoading: boolean;
  appLocale: string;
}

export function MetaBillingCard({ metaBilling, metaLoading, appLocale }: Props) {
  const { t } = useTranslation();

  if (!metaBilling && !metaLoading) return null;

  return (
    <Card
      title={
        <span>
          <FacebookOutlined style={{ color: "#1877f2", marginRight: 8 }} />
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
        border: `1px solid ${billingShell.border}`,
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
        <Flex vertical gap="middle" style={{ width: "100%" }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8} lg={4}>
              <Statistic
                title={t("billing.metaAmountSpent")}
                value={metaBilling.amountSpent}
                precision={2}
                suffix={metaBilling.currency}
                prefix={<DollarOutlined />}
                valueStyle={{ color: "#cf1322" }}
              />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Statistic
                title={t("billing.metaBalance")}
                value={metaBilling.balance}
                precision={2}
                suffix={metaBilling.currency}
                prefix={<WalletOutlined />}
                valueStyle={{ color: "#3f8600" }}
              />
            </Col>
            {metaBilling.spendCap > 0 && (
              <Col xs={12} sm={8} lg={4}>
                <Statistic
                  title={t("billing.metaSpendCap")}
                  value={metaBilling.spendCap}
                  precision={2}
                  suffix={metaBilling.currency}
                />
              </Col>
            )}
            <Col xs={12} sm={8} lg={6}>
              <Descriptions size="small" column={1} style={{ marginTop: 4 }}>
                <Descriptions.Item label={t("billing.metaAccount")}>{metaBilling.accountName}</Descriptions.Item>
                <Descriptions.Item label={t("billing.metaFunding")}>
                  <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 4 }} />
                  {metaBilling.fundingSource}
                </Descriptions.Item>
              </Descriptions>
            </Col>
          </Row>

          <Card size="small" title={t("billing.metaTransactions")} styles={{ body: { padding: 0 } }}>
            {metaBilling.transactions.length === 0 ? (
              <Typography.Text type="secondary" style={{ padding: 12, display: "block" }}>
                {t("billing.metaNoTransactions")}
              </Typography.Text>
            ) : (
              <Table
                size="small"
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
                    render: (value: string) => fmtDateTime(value, appLocale),
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
                      <Typography.Text strong style={{ color: r.txType === "REFUND" ? "#1677ff" : undefined }}>
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
          </Card>
        </Flex>
      )}
    </Card>
  );
}

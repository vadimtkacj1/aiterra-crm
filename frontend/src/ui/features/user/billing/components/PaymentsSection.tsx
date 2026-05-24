import { CheckCircleOutlined, DownloadOutlined } from "@ant-design/icons";
import { Button, Card, Col, Descriptions, Flex, Modal, Row, Space, Table, Tag, Typography } from "antd";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PaymentRecord } from "@/domain/Billing";
import type { BillingOverview } from "@/services/billing/IBillingService";
import { downloadInvoicePdf } from "@/ui/shared/utils/invoicePdf";
import { billingShell, formatInvoiceMoney } from "./billingUtils";

interface Props {
  overview: BillingOverview | null;
  loading: boolean;
  appLocale: string;
  accountId: string;
}

function InvoicePaymentStatusTag({ status }: { status: PaymentRecord["status"] }) {
  const { t } = useTranslation();
  const label =
    status === "succeeded"
      ? t("billing.statusSucceeded")
      : status === "pending"
        ? t("billing.statusPending")
        : t("billing.statusFailed");
  if (status === "succeeded") {
    return (
      <Tag icon={<CheckCircleOutlined />} color="success" style={{ marginInlineEnd: 0 }}>
        {label}
      </Tag>
    );
  }
  if (status === "pending") {
    return (
      <Tag color="warning" style={{ marginInlineEnd: 0 }}>
        {label}
      </Tag>
    );
  }
  return (
    <Tag color="error" style={{ marginInlineEnd: 0 }}>
      {label}
    </Tag>
  );
}

export function PaymentsSection({ overview, loading, appLocale, accountId }: Props) {
  const { t } = useTranslation();
  const [activeInvoice, setActiveInvoice] = useState<BillingOverview["payments"][number] | null>(null);

  const downloadPaymentPdf = useCallback(
    (row: BillingOverview["payments"][number]) => {
      downloadInvoicePdf({
        invoiceId: row.id,
        amount: row.amount,
        currency: row.currency,
        status: row.status === "succeeded" ? "paid" : row.status,
        description: row.description,
        chargeType: "one_time",
        accountId,
        createdAt: row.date,
      });
    },
    [accountId],
  );

  const tableEmpty = (text: string) => (
    <Flex justify="center" align="center" style={{ padding: "28px 16px" }}>
      <Typography.Text type="secondary" style={{ fontSize: 14 }}>
        {text}
      </Typography.Text>
    </Flex>
  );

  return (
    <>
      <Typography.Title
        level={5}
        style={{
          margin: "4px 0 0",
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--ant-color-text-tertiary)",
        }}
      >
        {t("billing.sectionYourPayments")}
      </Typography.Title>

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24}>
          <Card
            title={t("billing.invoices")}
            loading={loading}
            size="small"
            variant="borderless"
            styles={{
              header: { borderBottom: `1px solid ${billingShell.borderInner}` },
              body: { padding: 0 },
            }}
            style={{
              height: "100%",
              borderRadius: billingShell.radiusMd,
              boxShadow: billingShell.shadow,
              border: `1px solid ${billingShell.border}`,
            }}
          >
            <Table
              size="small"
              rowKey="id"
              scroll={{ x: 500 }}
              pagination={{ pageSize: 5 }}
              dataSource={overview?.payments ?? []}
              locale={{ emptyText: tableEmpty(t("billing.emptyPayments")) }}
              columns={[
                { title: t("billing.date"), dataIndex: "date", key: "date", width: 108 },
                {
                  title: t("billing.invoiceNumberShort"),
                  dataIndex: "id",
                  key: "id",
                  width: 132,
                  ellipsis: true,
                  render: (id: string) => (
                    <Typography.Text strong style={{ fontVariantNumeric: "tabular-nums" }}>
                      {id}
                    </Typography.Text>
                  ),
                },
                {
                  title: t("billing.total"),
                  key: "amount",
                  width: 100,
                  render: (_, r) => formatInvoiceMoney(r.amount, r.currency, appLocale),
                },
                {
                  title: t("billing.status"),
                  dataIndex: "status",
                  key: "status",
                  width: 120,
                  render: (s: PaymentRecord["status"]) => <InvoicePaymentStatusTag status={s} />,
                },
                {
                  title: t("billing.actions"),
                  key: "actions",
                  width: 200,
                  render: (_, r) => (
                    <Space size={8} wrap>
                      <Button
                        type="primary"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => downloadPaymentPdf(r)}
                        style={{ borderRadius: 8 }}
                      >
                        PDF
                      </Button>
                      <Button
                        type="link"
                        onClick={() => setActiveInvoice(r)}
                        style={{ padding: 0, height: "auto", fontWeight: 500 }}
                      >
                        {t("billing.view")}
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={t("billing.invoiceDetailsTitle")}
        open={Boolean(activeInvoice)}
        onCancel={() => setActiveInvoice(null)}
        footer={null}
        width={480}
      >
        {activeInvoice ? (
          <>
            <Flex justify="space-between" align="flex-start" gap={16} wrap="wrap" style={{ marginBottom: 16 }}>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                  {t("billing.status")}
                </Typography.Text>
                <InvoicePaymentStatusTag status={activeInvoice.status} />
              </div>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => downloadPaymentPdf(activeInvoice)}
                style={{ borderRadius: 8 }}
              >
                {t("billing.downloadPdf")}
              </Button>
            </Flex>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label={t("billing.date")}>{activeInvoice.date}</Descriptions.Item>
              <Descriptions.Item label={t("billing.total")}>
                {formatInvoiceMoney(activeInvoice.amount, activeInvoice.currency, appLocale)}
              </Descriptions.Item>
              <Descriptions.Item label={t("billing.description")}>{activeInvoice.description}</Descriptions.Item>
              <Descriptions.Item label={t("billing.invoiceId")}>
                <Typography.Text strong>{activeInvoice.id}</Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </>
        ) : null}
      </Modal>
    </>
  );
}

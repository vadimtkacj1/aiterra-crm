import { CheckCircleOutlined, DownloadOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Modal, Space, Table, Tag, Typography } from "antd";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PaymentRecord } from "@/domain/Billing";
import type { BillingOverview } from "@/services/billing/IBillingService";
import { downloadInvoicePdf } from "@/ui/shared/utils/invoicePdf";
import { billingShell, formatInvoiceMoney } from "./billingUtils";
import { EmptyState } from "@/ui/shared/components/EmptyState";
import { ResponsiveCardView, useMobileView } from "@/ui/shared/components/ResponsiveCardView";

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
  const isMobile = useMobileView();

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

  return (
    <>
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
          borderRadius: billingShell.radiusMd,
          boxShadow: billingShell.shadow,
          border: `1px solid ${billingShell.borderInner}`,
        }}
      >
            {isMobile ? (
              <ResponsiveCardView
                items={(overview?.payments ?? []).map((r) => ({
                  id: r.id,
                  title: `#${r.id}`,
                  subtitle: r.date,
                  description: r.description,
                  tags: [
                    {
                      label: r.status === "succeeded" ? t("billing.statusSucceeded") : r.status === "pending" ? t("billing.statusPending") : t("billing.statusFailed"),
                      color: r.status === "succeeded" ? "success" : r.status === "pending" ? "warning" : "error",
                    },
                  ],
                  extra: (
                    <Typography.Text strong style={{ fontSize: 14 }}>
                      {formatInvoiceMoney(r.amount, r.currency, appLocale)}
                    </Typography.Text>
                  ),
                  actions: [
                    {
                      label: "PDF",
                      onClick: () => downloadPaymentPdf(r),
                      icon: <DownloadOutlined />,
                      type: "primary" as const,
                    },
                    {
                      label: t("billing.view"),
                      onClick: () => setActiveInvoice(r),
                      type: "link" as const,
                    },
                  ],
                }))}
                loading={loading}
                emptyText={t("billing.emptyPayments")}
              />
            ) : (
              <Table
                size="middle"
                rowKey="id"
                scroll={{ x: 500 }}
                pagination={{ pageSize: 5 }}
                dataSource={overview?.payments ?? []}
                locale={{ emptyText: <EmptyState title={t("billing.emptyPayments")} style={{ padding: "24px 16px" }} /> }}
                columns={[
                  {
                    title: t("billing.date"),
                    dataIndex: "date",
                    key: "date",
                    width: 108,
                    render: (v: string) => <span style={{ fontVariantNumeric: "tabular-nums" }}>{v}</span>,
                  },
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
                    render: (_, r) => (
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatInvoiceMoney(r.amount, r.currency, appLocale)}
                      </span>
                    ),
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
            )}
      </Card>

      <Modal
        title={t("billing.invoiceDetailsTitle")}
        open={Boolean(activeInvoice)}
        onCancel={() => setActiveInvoice(null)}
        footer={
          activeInvoice ? (
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => downloadPaymentPdf(activeInvoice)}
              style={{ borderRadius: 8 }}
            >
              {t("billing.downloadPdf")}
            </Button>
          ) : null
        }
        width={480}
      >
        {activeInvoice ? (
          <>
            <Flex align="flex-start" style={{ marginBottom: 16 }}>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                  {t("billing.status")}
                </Typography.Text>
                <InvoicePaymentStatusTag status={activeInvoice.status} />
              </div>
            </Flex>
            <div>
              {(
                [
                  { key: "date", label: t("billing.date"), value: activeInvoice.date },
                  {
                    key: "total",
                    label: t("billing.total"),
                    value: (
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatInvoiceMoney(activeInvoice.amount, activeInvoice.currency, appLocale)}
                      </span>
                    ),
                  },
                  { key: "description", label: t("billing.description"), value: activeInvoice.description },
                  {
                    key: "invoiceId",
                    label: t("billing.invoiceId"),
                    value: <Typography.Text strong>{activeInvoice.id}</Typography.Text>,
                  },
                ] as const
              ).map((row, index) => (
                <Flex
                  key={row.key}
                  justify="space-between"
                  align="baseline"
                  gap={16}
                  style={
                    index === 0
                      ? undefined
                      : { borderTop: "1px solid var(--ds-border-subtle)", paddingTop: 12, marginTop: 12 }
                  }
                >
                  <Typography.Text type="secondary">{row.label}</Typography.Text>
                  <Typography.Text style={{ textAlign: "end" }}>{row.value}</Typography.Text>
                </Flex>
              ))}
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}

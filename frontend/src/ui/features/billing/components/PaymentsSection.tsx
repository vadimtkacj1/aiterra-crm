import { Button, Card, Col, Descriptions, Flex, Modal, Row, Table, Typography } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BillingOverview } from "../../../../services/interfaces/IBillingService";
import { billingShell, formatInvoiceMoney } from "./billingUtils";

interface Props {
  overview: BillingOverview | null;
  loading: boolean;
  appLocale: string;
}

export function PaymentsSection({ overview, loading, appLocale }: Props) {
  const { t } = useTranslation();
  const [activeInvoice, setActiveInvoice] = useState<BillingOverview["payments"][number] | null>(null);

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
                { title: t("billing.date"), dataIndex: "date", key: "date", width: 100 },
                {
                  title: t("billing.total"),
                  key: "amount",
                  width: 110,
                  render: (_, r) => formatInvoiceMoney(r.amount, r.currency, appLocale),
                },
                {
                  title: t("billing.status"),
                  dataIndex: "status",
                  key: "status",
                  width: 100,
                  render: (s: string) => {
                    const label =
                      s === "succeeded"
                        ? t("billing.statusSucceeded")
                        : s === "pending"
                          ? t("billing.statusPending")
                          : t("billing.statusFailed");
                    return <Typography.Text>{label}</Typography.Text>;
                  },
                },
                {
                  title: t("billing.actions"),
                  key: "actions",
                  width: 90,
                  render: (_, r) => (
                    <Button
                      type="link"
                      onClick={() => setActiveInvoice(r)}
                      style={{ padding: 0, height: "auto", fontWeight: 500 }}
                    >
                      {t("billing.view")}
                    </Button>
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
      >
        {activeInvoice ? (
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label={t("billing.date")}>{activeInvoice.date}</Descriptions.Item>
            <Descriptions.Item label={t("billing.total")}>
              {formatInvoiceMoney(activeInvoice.amount, activeInvoice.currency, appLocale)}
            </Descriptions.Item>
            <Descriptions.Item label={t("billing.status")}>
              {activeInvoice.status === "succeeded"
                ? t("billing.statusSucceeded")
                : activeInvoice.status === "pending"
                  ? t("billing.statusPending")
                  : t("billing.statusFailed")}
            </Descriptions.Item>
            <Descriptions.Item label={t("billing.description")}>{activeInvoice.description}</Descriptions.Item>
            <Descriptions.Item label={t("billing.invoiceId")}>{activeInvoice.id}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>
    </>
  );
}

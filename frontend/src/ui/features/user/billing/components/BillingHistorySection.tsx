import { DownloadOutlined } from "@ant-design/icons";
import { Button, Card, Table, Tag, Tooltip, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { UserBillingHistoryRow } from "@/services/billing/IBillingService";
import { ResponsiveCardView, useMobileView } from "@/ui/shared/components/ResponsiveCardView";
import { billingShell, formatInvoiceMoney, fmtDateTime } from "./billingUtils";
import { downloadInvoicePdf } from "@/ui/shared/utils/invoicePdf";

interface Props {
  rows: UserBillingHistoryRow[];
  loading: boolean;
  appLocale: string;
  accountId: string;
}

function PaymentStatusTag({ status }: { status: UserBillingHistoryRow["paymentStatus"] }) {
  const { t } = useTranslation();
  const map: Record<string, { label: string; color: string }> = {
    paid: { label: t("billing.historyStatusPaid"), color: "success" },
    unpaid: { label: t("billing.historyStatusUnpaid"), color: "warning" },
    ongoing: { label: t("billing.historyStatusOngoing"), color: "processing" },
    voided: { label: t("billing.historyStatusVoided"), color: "default" },
    cancelled: { label: t("billing.historyStatusCancelled"), color: "error" },
    superseded: { label: t("billing.historyStatusSuperseded"), color: "default" },
    unknown: { label: t("billing.historyStatusUnknown"), color: "default" },
  };
  const cfg = map[status] ?? map.unknown;
  return <Tag color={cfg.color} style={{ marginInlineEnd: 0 }}>{cfg.label}</Tag>;
}

export function BillingHistorySection({ rows, loading, appLocale, accountId }: Props) {
  const { t } = useTranslation();
  const isMobile = useMobileView();

  const downloadRow = (r: UserBillingHistoryRow) => {
    if (!r.amount) return;
    downloadInvoicePdf({
      invoiceId: String(r.id),
      amount: r.amount,
      currency: r.currency,
      status: r.paymentStatus === "paid" ? "paid" : r.paymentStatus,
      description: r.description ?? undefined,
      chargeType: r.chargeType,
      accountId,
      createdAt: r.createdAt,
    });
  };

  return (
    <>
      <Card
        title={t("billing.historyCardTitle")}
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
          border: `1px solid ${billingShell.border}`,
        }}
      >
        {isMobile ? (
          <ResponsiveCardView
            items={rows.map((r) => ({
              id: String(r.id),
              title: r.description ?? `#${r.id}`,
              subtitle: fmtDateTime(r.createdAt, appLocale),
              tags: [
                {
                  label: r.chargeType === "monthly" ? t("billing.chargeTypeMonthly") : t("billing.chargeTypeOneTime"),
                  color: r.chargeType === "monthly" ? "purple" : "blue",
                },
                {
                  label: (() => {
                    const labels: Record<string, string> = {
                      paid: t("billing.historyStatusPaid"),
                      unpaid: t("billing.historyStatusUnpaid"),
                      ongoing: t("billing.historyStatusOngoing"),
                      voided: t("billing.historyStatusVoided"),
                      cancelled: t("billing.historyStatusCancelled"),
                      superseded: t("billing.historyStatusSuperseded"),
                      unknown: t("billing.historyStatusUnknown"),
                    };
                    return labels[r.paymentStatus] ?? r.paymentStatus;
                  })(),
                  color: r.paymentStatus === "paid" ? "success" : r.paymentStatus === "unpaid" ? "warning" : r.paymentStatus === "ongoing" ? "processing" : r.paymentStatus === "cancelled" ? "error" : "default",
                },
              ],
              extra: r.amount != null ? (
                <Typography.Text strong style={{ fontSize: 14 }}>
                  {formatInvoiceMoney(r.amount, r.currency, appLocale)}
                </Typography.Text>
              ) : undefined,
              actions: r.amount
                ? [{ label: "PDF", onClick: () => downloadRow(r), icon: <DownloadOutlined />, type: "default" as const }]
                : [],
            }))}
            loading={loading}
            emptyText={t("billing.historyEmpty")}
          />
        ) : (
          <Table
            size="small"
            rowKey="id"
            scroll={{ x: 560 }}
            pagination={{ pageSize: 8 }}
            dataSource={rows}
            locale={{
              emptyText: (
                <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                  {t("billing.historyEmpty")}
                </Typography.Text>
              ),
            }}
            columns={[
              {
                title: t("billing.date"),
                dataIndex: "createdAt",
                width: 140,
                render: (v: string) => fmtDateTime(v, appLocale),
              },
              {
                title: t("billing.description"),
                dataIndex: "description",
                ellipsis: true,
                render: (v: string | null) => v ?? "—",
              },
              {
                title: t("billing.historyColType"),
                dataIndex: "chargeType",
                width: 100,
                render: (ct: string) =>
                  ct === "monthly" ? (
                    <Tag color="purple">{t("billing.chargeTypeMonthly")}</Tag>
                  ) : (
                    <Tag color="blue">{t("billing.chargeTypeOneTime")}</Tag>
                  ),
              },
              {
                title: t("billing.amount"),
                key: "amount",
                width: 120,
                render: (_, r: UserBillingHistoryRow) => {
                  if (r.amount == null) return "—";
                  const main = formatInvoiceMoney(r.amount, r.currency, appLocale);
                  if (r.chargeType === "monthly" && r.installmentMonths && r.installmentMonths >= 2 && r.installmentTotalAmount) {
                    return (
                      <div>
                        <Typography.Text strong style={{ fontVariantNumeric: "tabular-nums" }}>{main}</Typography.Text>
                        <Typography.Text type="secondary" style={{ display: "block", fontSize: 11 }}>
                          {t("billing.historyInstallmentNote", {
                            total: formatInvoiceMoney(r.installmentTotalAmount, r.currency, appLocale),
                            months: r.installmentMonths,
                          })}
                        </Typography.Text>
                      </div>
                    );
                  }
                  return <Typography.Text style={{ fontVariantNumeric: "tabular-nums" }}>{main}</Typography.Text>;
                },
              },
              {
                title: t("billing.status"),
                dataIndex: "paymentStatus",
                width: 110,
                render: (s: UserBillingHistoryRow["paymentStatus"]) => <PaymentStatusTag status={s} />,
              },
              {
                title: "",
                key: "actions",
                width: 52,
                render: (_, r: UserBillingHistoryRow) =>
                  r.amount ? (
                    <Tooltip title={t("billing.downloadPdf")}>
                      <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadRow(r)} />
                    </Tooltip>
                  ) : null,
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}

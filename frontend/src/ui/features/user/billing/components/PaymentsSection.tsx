import { CircleCheck, Download } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PaymentRecord } from "@/domain/Billing";
import type { BillingOverview } from "@/services/billing/IBillingService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadInvoicePdf } from "@/ui/shared/utils/invoicePdf";
import { formatInvoiceMoney } from "./billingUtils";
import { AppModal } from "@/ui/shared/components/AppModal";
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
      <Badge variant="success">
        <CircleCheck aria-hidden="true" />
        {label}
      </Badge>
    );
  }
  if (status === "pending") {
    return <Badge variant="warning">{label}</Badge>;
  }
  return <Badge variant="error">{label}</Badge>;
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

  const columns: DataTableColumn<BillingOverview["payments"][number]>[] = [
    {
      title: t("billing.date"),
      dataIndex: "date",
      key: "date",
      width: 108,
      render: (v) => <span className="tabular-nums">{v as string}</span>,
    },
    {
      title: t("billing.invoiceNumberShort"),
      dataIndex: "id",
      key: "id",
      width: 132,
      render: (id) => (
        <span className="block max-w-30 truncate font-semibold tabular-nums">{id as string}</span>
      ),
    },
    {
      title: t("billing.total"),
      key: "amount",
      width: 100,
      render: (_, r) => (
        <span className="tabular-nums">{formatInvoiceMoney(r.amount, r.currency, appLocale)}</span>
      ),
    },
    {
      title: t("billing.status"),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s) => <InvoicePaymentStatusTag status={s as PaymentRecord["status"]} />,
    },
    {
      title: t("billing.actions"),
      key: "actions",
      width: 200,
      render: (_, r) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="rounded-lg" onClick={() => downloadPaymentPdf(r)}>
            <Download aria-hidden="true" />
            PDF
          </Button>
          <Button
            variant="link"
            className="h-auto p-0 font-medium"
            onClick={() => setActiveInvoice(r)}
          >
            {t("billing.view")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card className="rounded-xl border-(--ds-border-subtle) shadow-(--ds-shadow-card)">
        <div className="border-b border-(--ds-border-subtle) px-4 py-3">
          <span className="text-[15px] font-semibold">{t("billing.invoices")}</span>
        </div>
        {loading && !isMobile ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : isMobile ? (
          <div className="p-3">
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
                  <span className="text-sm font-semibold tabular-nums">
                    {formatInvoiceMoney(r.amount, r.currency, appLocale)}
                  </span>
                ),
                actions: [
                  {
                    label: "PDF",
                    onClick: () => downloadPaymentPdf(r),
                    icon: <Download aria-hidden="true" />,
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
          </div>
        ) : (
          <DataTable<BillingOverview["payments"][number]>
            rowKey="id"
            scroll={{ x: 500 }}
            pagination={{ pageSize: 5 }}
            dataSource={overview?.payments ?? []}
            locale={{ emptyText: <EmptyState title={t("billing.emptyPayments")} style={{ padding: "24px 16px" }} /> }}
            columns={columns}
          />
        )}
      </Card>

      <AppModal
        title={t("billing.invoiceDetailsTitle")}
        open={Boolean(activeInvoice)}
        onCancel={() => setActiveInvoice(null)}
        footer={
          activeInvoice ? (
            <Button className="rounded-lg" onClick={() => downloadPaymentPdf(activeInvoice)}>
              <Download aria-hidden="true" />
              {t("billing.downloadPdf")}
            </Button>
          ) : null
        }
        width={480}
      >
        {activeInvoice ? (
          <>
            <div className="mb-4 flex items-start">
              <div>
                <span className="mb-1.5 block text-xs text-muted-foreground">
                  {t("billing.status")}
                </span>
                <InvoicePaymentStatusTag status={activeInvoice.status} />
              </div>
            </div>
            <div>
              {(
                [
                  { key: "date", label: t("billing.date"), value: activeInvoice.date },
                  {
                    key: "total",
                    label: t("billing.total"),
                    value: (
                      <span className="tabular-nums">
                        {formatInvoiceMoney(activeInvoice.amount, activeInvoice.currency, appLocale)}
                      </span>
                    ),
                  },
                  { key: "description", label: t("billing.description"), value: activeInvoice.description },
                  {
                    key: "invoiceId",
                    label: t("billing.invoiceId"),
                    value: <span className="font-semibold">{activeInvoice.id}</span>,
                  },
                ] as const
              ).map((row, index) => (
                <div
                  key={row.key}
                  className="flex items-baseline justify-between gap-4"
                  style={
                    index === 0
                      ? undefined
                      : { borderTop: "1px solid var(--ds-border-subtle)", paddingTop: 12, marginTop: 12 }
                  }
                >
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-end text-sm">{row.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </AppModal>
    </>
  );
}

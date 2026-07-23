import { CircleCheck, CircleDollarSign, CirclePause, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { MetaAccountBilling } from "@/domain/CampaignAnalytics";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { badgeVariantFromTagColor, fmtDateTime, formatInvoiceMoney, statusColor } from "./billingUtils";

interface Props {
  metaBilling: MetaAccountBilling | null;
  metaLoading: boolean;
  appLocale: string;
}

type MetaTransaction = MetaAccountBilling["transactions"][number];

/** Facebook brand glyph (lucide dropped brand icons; same stroke style). */
function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

/** §3 stat block: caps-XS muted label, bold tabular value, subtle muted icon.
 *  Borderless on purpose — it lives inside the section card (no card-in-card). */
function MetaStat({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex min-h-16 items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate whitespace-nowrap text-[11px] font-medium uppercase leading-[1.3] tracking-(--ds-letter-spacing-caps) text-(--ds-text-secondary)">
          {label}
        </div>
        <div className="mt-1.5 truncate whitespace-nowrap text-[28px] font-bold leading-[1.15] tracking-[-0.02em] tabular-nums">
          {value}
        </div>
      </div>
      {icon ? (
        <span aria-hidden className="mt-0.5 shrink-0 text-(--ds-text-tertiary) [&_svg]:size-4.5">
          {icon}
        </span>
      ) : null}
    </div>
  );
}

export function MetaBillingCard({ metaBilling, metaLoading, appLocale }: Props) {
  const { t } = useTranslation();

  if (!metaBilling && !metaLoading) return null;

  const columns: DataTableColumn<MetaTransaction>[] = [
    {
      title: t("billing.date"),
      dataIndex: "time",
      key: "time",
      width: 160,
      render: (value) => <span className="tabular-nums">{fmtDateTime(value as string, appLocale)}</span>,
    },
    {
      title: t("billing.metaTxType"),
      dataIndex: "txType",
      key: "type",
      width: 100,
      render: (s) => (
        <Badge variant={(s as string) === "REFUND" ? "processing" : "default"}>{s as string}</Badge>
      ),
    },
    {
      title: t("billing.amount"),
      key: "amount",
      width: 120,
      render: (_, r) => (
        <span
          className="font-semibold tabular-nums"
          style={{ color: r.txType === "REFUND" ? "var(--ds-color-info)" : undefined }}
        >
          {r.txType === "REFUND" ? "+" : ""}
          {r.amount.toFixed(2)} {r.currency}
        </span>
      ),
    },
    {
      title: t("billing.status"),
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (s) => (
        <Badge variant={badgeVariantFromTagColor(statusColor(s as string))}>{s as string}</Badge>
      ),
    },
  ];

  return (
    <Card className="rounded-xl border-(--ds-border-subtle) shadow-(--ds-shadow-card)">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--ds-border-subtle) px-4 py-3">
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <FacebookGlyph className="size-4 text-[#1877f2]" />
          {t("billing.metaTitle")}
        </span>
        {metaBilling && (
          <span className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full"
              style={{
                background:
                  metaBilling.accountStatus === "ACTIVE"
                    ? "var(--ds-color-success)"
                    : "var(--ds-color-error)",
              }}
            />
            {metaBilling.accountStatus}
          </span>
        )}
      </div>

      {metaLoading ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : metaBilling ? (
        <div className="flex w-full flex-col gap-4 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetaStat
              label={t("billing.metaAmountSpent")}
              value={formatInvoiceMoney(metaBilling.amountSpent, metaBilling.currency, appLocale)}
              icon={<CircleDollarSign />}
            />
            <MetaStat
              label={t("billing.metaBalance")}
              value={formatInvoiceMoney(metaBilling.balance, metaBilling.currency, appLocale)}
              icon={<Wallet />}
            />
            {metaBilling.spendCap > 0 && (
              <MetaStat
                label={t("billing.metaSpendCap")}
                value={formatInvoiceMoney(metaBilling.spendCap, metaBilling.currency, appLocale)}
                icon={<CirclePause />}
              />
            )}
            <div className="flex min-h-16 flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">
                {t("billing.metaAccount")}:{" "}
                <span className="text-foreground">{metaBilling.accountName}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {t("billing.metaFunding")}:{" "}
                <CircleCheck
                  aria-hidden="true"
                  className="me-1 inline size-3.5 align-text-bottom"
                  style={{ color: "var(--ds-color-success)" }}
                />
                <span className="text-foreground">{metaBilling.fundingSource}</span>
              </span>
            </div>
          </div>

          <div className="-mx-4 border-t border-(--ds-border-subtle)">
            <span className="block px-4 pb-1 pt-3 text-[13px] font-semibold">
              {t("billing.metaTransactions")}
            </span>
            {metaBilling.transactions.length === 0 ? (
              <span className="block px-4 py-3 text-sm text-muted-foreground">
                {t("billing.metaNoTransactions")}
              </span>
            ) : (
              <DataTable<MetaTransaction>
                rowKey="id"
                scroll={{ x: 500 }}
                pagination={{ pageSize: 10 }}
                dataSource={metaBilling.transactions}
                columns={columns}
              />
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

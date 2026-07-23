import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import type { ContractMemberRow } from "../../../../../domain/Contract";
import { useApp } from "../../../../../app/AppProviders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Spinner } from "@/components/ui/spinner";
import { message } from "@/lib/toast";
import { EmptyState } from "../../../../shared/components/EmptyState";
import { PageHeader } from "../../../../shared/components/PageHeader";
import { UserContentLayout } from "../../../../shared/components/UserContentLayout";
import { ResponsiveCardView, useMobileView } from "../../../../shared/components/ResponsiveCardView";

function fmtMoney(amount: number, currency: string, locale?: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: (currency || "ILS").toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

type TagVariant = "default" | "primary" | "processing" | "success" | "warning" | "error";

function statusMeta(status: ContractMemberRow["status"]): [TagVariant, string] {
  const map: Record<string, [TagVariant, string]> = {
    draft: ["default", "admin.contracts.status.draft"],
    pending_signature: ["processing", "admin.contracts.status.pending_signature"],
    signed: ["success", "admin.contracts.status.signed"],
    voided: ["error", "admin.contracts.status.voided"],
  };
  return map[status] ?? ["default", status];
}

function paymentMeta(contract: ContractMemberRow): [TagVariant, string] {
  const total = contract.totalAmount ?? 0;
  const paidAmount =
    contract.stages?.reduce((sum, stage) => (stage.status === "paid" ? sum + stage.amount : sum), 0) ?? 0;
  const roundedTotal = Math.round((total || 0) * 100);
  const roundedPaid = Math.round(paidAmount * 100);

  if (roundedPaid <= 0) {
    return ["error", "memberContracts.paymentStatusUnpaid"];
  }
  if (roundedPaid >= roundedTotal) {
    return ["success", "memberContracts.paymentStatusPaid"];
  }
  return ["warning", "memberContracts.paymentStatusPartial"];
}

function hasUnpaidStage(contract: ContractMemberRow): boolean {
  return Boolean(contract.stages?.some((stage) => stage.status !== "paid"));
}

function isMonthly(contract: ContractMemberRow): boolean {
  return Boolean(contract.monthlyAmount && contract.monthlyAmount > 0);
}

function paidCounts(contract: ContractMemberRow) {
  const stagesTotal = contract.stages?.length ?? 0;
  const stagesPaid =
    contract.stages?.reduce((sum, stage) => (stage.status === "paid" ? sum + 1 : sum), 0) ?? 0;
  const paidAmount =
    contract.stages?.reduce((sum, stage) => (stage.status === "paid" ? sum + stage.amount : sum), 0) ?? 0;
  return { stagesPaid, stagesTotal, paidAmount };
}

export function MemberContractsPage() {
  const { t, i18n } = useTranslation();
  const { services } = useApp();
  const { accountId } = useParams<{ accountId: string }>();
  const money = (amount: number, currency: string) => fmtMoney(amount, currency, i18n.language);
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" });
  const [rows, setRows] = useState<ContractMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payLoadingId, setPayLoadingId] = useState<number | null>(null);
  const isMobile = useMobileView();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.billing.fetchAccountContracts(accountId ?? "0");
      setRows(data);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("memberContracts.loadError"));
    } finally {
      setLoading(false);
    }
  }, [services.billing, accountId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleContractPay = useCallback(
    async (contract: ContractMemberRow) => {
      if (!contract.signToken) return;
      setPayLoadingId(contract.id);
      try {
        const res = await fetch(`/api/contracts/${encodeURIComponent(contract.signToken)}/checkout`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = (await res.json()) as { detail?: string };
          throw new Error(data.detail ?? "error");
        }
        const payload = await res.json() as { paymentUrl?: string | null };
        const url = (payload.paymentUrl || "").trim();
        if (!url) {
          message.warning(t("contracts.sign.paymentLinkPending"));
          return;
        }
        window.location.assign(url);
      } catch (e) {
        message.error(e instanceof Error ? e.message : t("errors.generic"));
      } finally {
        setPayLoadingId(null);
      }
    },
    [t],
  );

  const columns: DataTableColumn<ContractMemberRow>[] = [
    {
      title: t("memberContracts.colTitle"),
      dataIndex: "title",
      key: "title",
      render: (title, r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">{title as string}</span>
          {isMonthly(r) && (
            <div className="flex flex-wrap gap-1">
              <Badge variant="processing" className="text-[11px]">
                {t("memberContracts.monthlyBadge")}
              </Badge>
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("memberContracts.monthlyAmount", { amount: money(r.monthlyAmount!, r.currency) })}
                {r.subscriptionMonths ? ` · ${t("memberContracts.monthlyDuration", { months: r.subscriptionMonths })}` : ""}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t("memberContracts.colPaymentStatus"),
      key: "paymentStatus",
      width: 200,
      render: (_, r) => {
        const [variant, key] = paymentMeta(r);
        const { stagesPaid, stagesTotal, paidAmount } = paidCounts(r);
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant={variant}>{t(key)}</Badge>
              <span className="text-[13px] font-semibold tabular-nums">
                {money(r.totalAmount, r.currency)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("memberContracts.paymentProgress", {
                paid: stagesPaid,
                total: stagesTotal,
                paidAmount: money(paidAmount, r.currency),
                totalAmount: money(r.totalAmount, r.currency),
              })}
            </span>
          </div>
        );
      },
    },
    {
      title: t("memberContracts.colStatus"),
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status) => {
        const [variant, i18nKey] = statusMeta(status as ContractMemberRow["status"]);
        return <Badge variant={variant}>{t(i18nKey)}</Badge>;
      },
    },
    {
      title: t("memberContracts.colSigned"),
      key: "signedAt",
      width: 120,
      render: (_, r) => (r.signedAt ? <span className="tabular-nums">{fmtDate(r.signedAt)}</span> : "-"),
    },
    {
      title: t("memberContracts.colAction"),
      key: "action",
      width: 140,
      render: (_, r) => {
        const payAvailable = hasUnpaidStage(r) && r.status === "signed";
        return (
          <div className="flex items-center gap-1.5">
            <Button variant="link" size="sm" asChild>
              <a href={`/contracts/sign/${encodeURIComponent(r.signToken)}`} target="_blank" rel="noreferrer">
                {r.status === "signed"
                  ? t("memberContracts.actionDownload")
                  : t("memberContracts.actionSign")}
              </a>
            </Button>
            {payAvailable && (
              <Button
                size="sm"
                disabled={payLoadingId === r.id}
                onClick={() => void handleContractPay(r)}
              >
                {payLoadingId === r.id && (
                  <Spinner size="sm" className="text-current" aria-hidden="true" />
                )}
                {t("memberContracts.actionPay")}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <UserContentLayout>
      <div className="w-full">
        <PageHeader
          title={t("memberContracts.title")}
          subtitle={t("memberContracts.subtitle")}
          extra={
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? (
                <Spinner size="sm" className="text-current" aria-hidden="true" />
              ) : (
                <RefreshCw aria-hidden="true" />
              )}
              {t("common.reload")}
            </Button>
          }
        />
        <Card className="overflow-hidden rounded-xl border-(--ds-border-subtle) shadow-(--ds-shadow-card)">
          {!loading && rows.length === 0 ? (
            <EmptyState title={t("memberContracts.empty")} />
          ) : isMobile ? (
            <div className="p-3">
              <ResponsiveCardView
                items={rows.map((r) => {
                  const [statusVariant, statusKey] = statusMeta(r.status);
                  const [paymentVariant, paymentKey] = paymentMeta(r);
                  const { stagesPaid, stagesTotal, paidAmount } = paidCounts(r);
                  const payAvailable = hasUnpaidStage(r) && r.status === "signed";
                  const monthly = isMonthly(r);

                  return {
                    id: r.id,
                    title: r.title,
                    subtitle: r.signedAt ? fmtDate(r.signedAt) : t("memberContracts.notSigned"),
                    description: monthly
                      ? [
                          t("memberContracts.monthlyAmount", { amount: money(r.monthlyAmount!, r.currency) }),
                          r.subscriptionMonths ? t("memberContracts.monthlyDuration", { months: r.subscriptionMonths }) : "",
                          t("memberContracts.paymentProgress", {
                            paid: stagesPaid,
                            total: stagesTotal,
                            paidAmount: money(paidAmount, r.currency),
                            totalAmount: money(r.totalAmount, r.currency),
                          }),
                        ].filter(Boolean).join(" · ")
                      : t("memberContracts.paymentProgress", {
                          paid: stagesPaid,
                          total: stagesTotal,
                          paidAmount: money(paidAmount, r.currency),
                          totalAmount: money(r.totalAmount, r.currency),
                        }),
                    tags: [
                      ...(monthly ? [{ label: t("memberContracts.monthlyBadge"), color: "blue" }] : []),
                      { label: t(statusKey), color: statusVariant },
                      { label: t(paymentKey), color: paymentVariant },
                    ],
                    extra: null,
                    actions: [
                      {
                        label: r.status === "signed"
                          ? t("memberContracts.actionDownload")
                          : t("memberContracts.actionSign"),
                        onClick: () => window.open(`/contracts/sign/${encodeURIComponent(r.signToken)}`, "_blank"),
                        type: "link" as const,
                      },
                      ...(payAvailable
                        ? [{
                            label: t("memberContracts.actionPay"),
                            onClick: () => void handleContractPay(r),
                            type: "primary" as const,
                          }]
                        : []),
                    ],
                  };
                })}
                loading={loading}
                emptyText={t("memberContracts.empty")}
              />
            </div>
          ) : (
            <DataTable<ContractMemberRow>
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={rows}
              pagination={rows.length > 10 ? { pageSize: 10 } : false}
              scroll={{ x: 720 }}
            />
          )}
        </Card>
      </div>
    </UserContentLayout>
  );
}

import { Download, Plus, Search, Trash2, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { confirm } from "@/lib/confirm";
import { message } from "@/lib/toast";
import { useApp } from "../../../../app/AppProviders";
import type { BillingHistoryWithAccountRow } from "../../../../services/admin/AdminService";
import { EmptyState } from "../../../shared/components/EmptyState";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponsiveCardView, useMobileView } from "../../../shared/components/ResponsiveCardView";
import { TableActionButton } from "../../../shared/components/TableActionButton";
import { downloadInvoicePdf } from "../../../shared/utils/invoicePdf";
import { formatHistoryDateTime, formatMoney, paymentStatusBadge } from "../payments/billingUi";

export function AdminInvoicesPage() {
  const { t } = useTranslation();
  const { services } = useApp();
  const isMobile = useMobileView();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<BillingHistoryWithAccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (r) =>
        (r.accountName ?? "").toLowerCase().includes(q) ||
        (r.ownerEmail ?? "").toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }, [invoices, search]);

  const reload = () => {
    setLoading(true);
    services.admin
      .listAllBillingHistory()
      .then(setInvoices)
      .catch(() => void message.error(t("admin.invoices.loadError")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevoke = async (row: BillingHistoryWithAccountRow) => {
    setRevokingId(row.id);
    try {
      await services.admin.revokeBillingHistoryRow(row.accountId, row.id);
      void message.success(t("admin.invoices.revokeSuccess"));
      reload();
    } catch (e) {
      void message.error(e instanceof Error ? e.message : t("errors.generic"));
    } finally {
      setRevokingId(null);
    }
  };

  const handleDelete = async (row: BillingHistoryWithAccountRow) => {
    setDeletingId(row.id);
    try {
      await services.admin.deleteBillingHistoryRow(row.accountId, row.id);
      void message.success(t("admin.invoices.deleteSuccess"));
      reload();
    } catch (e) {
      void message.error(e instanceof Error ? e.message : t("errors.generic"));
    } finally {
      setDeletingId(null);
    }
  };

  const confirmRevoke = (row: BillingHistoryWithAccountRow) =>
    confirm({
      title: t("admin.invoices.revokeConfirm"),
      content: t("admin.invoices.revokeConfirmDesc"),
      okText: t("admin.invoices.revokeOk"),
      cancelText: t("common.cancel"),
      danger: true,
      onOk: () => handleRevoke(row),
    });

  const confirmDelete = (row: BillingHistoryWithAccountRow) =>
    confirm({
      title: t("admin.invoices.deleteConfirm"),
      okText: t("common.ok"),
      cancelText: t("common.cancel"),
      danger: true,
      onOk: () => handleDelete(row),
    });

  const downloadPdf = (row: BillingHistoryWithAccountRow) => {
    downloadInvoicePdf({
      invoiceId: `inv_${row.accountId}_${row.id}`,
      amount: row.amount ?? 0,
      currency: row.currency,
      status: row.paymentStatus,
      description: row.description,
      chargeType: row.chargeType,
      accountId: row.accountId,
      customerName: row.ownerEmail || row.accountName || undefined,
      lineItems: row.lineItems?.map((li) => ({ code: li.code ?? "", label: li.label, amount: li.amount })),
      createdAt: row.createdAt,
      installmentMonths: row.installmentMonths ?? undefined,
      installmentTotalAmount: row.installmentTotalAmount ?? undefined,
    });
  };

  const columns: DataTableColumn<BillingHistoryWithAccountRow>[] = [
    {
      title: t("admin.invoices.table.created"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      onCell: () => ({ className: "tabular-nums" }),
      render: (v) => formatHistoryDateTime(v as string),
    },
    {
      title: t("admin.invoices.table.business"),
      key: "accountName",
      render: (_, r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold">{r.accountName}</div>
          {r.ownerEmail && (
            <div className="truncate text-xs text-(--ds-text-tertiary)">{r.ownerEmail}</div>
          )}
        </div>
      ),
    },
    {
      title: t("admin.invoices.table.type"),
      dataIndex: "chargeType",
      key: "chargeType",
      width: 110,
      render: (ct) =>
        (ct as string) === "monthly" ? (
          <Badge variant="primary">{t("admin.invoices.typeMonthly")}</Badge>
        ) : (
          <Badge variant="processing">{t("admin.invoices.typeOneTime")}</Badge>
        ),
    },
    {
      title: t("admin.invoices.table.amount"),
      key: "amount",
      width: 140,
      onCell: () => ({ className: "tabular-nums" }),
      render: (_, r) => {
        if (r.amount == null) return "-";
        const main = formatMoney(r.amount, r.currency || "ILS");
        if (
          r.chargeType === "monthly" &&
          r.installmentMonths != null &&
          r.installmentMonths >= 2 &&
          r.installmentTotalAmount != null
        ) {
          return (
            <div>
              <span className="font-semibold">{main}</span>
              <span className="block text-[11px] text-muted-foreground">
                {t("admin.invoices.installmentNote", {
                  total: formatMoney(r.installmentTotalAmount, r.currency || "ILS"),
                  months: r.installmentMonths,
                })}
              </span>
            </div>
          );
        }
        return main;
      },
    },
    {
      title: t("admin.invoices.table.paymentStatus"),
      key: "paymentStatus",
      width: 160,
      render: (_, r) => (
        <div className="flex flex-wrap items-center gap-1">
          {paymentStatusBadge(t, r.paymentStatus)}
          {r.recordStatus === "revoked" && (
            <Badge className="text-[11px]">{t("admin.invoices.statusRevoked")}</Badge>
          )}
          {r.recordStatus !== "active" && r.recordStatus !== "revoked" && (
            <Badge className="text-[11px]">{t("admin.invoices.statusSuperseded")}</Badge>
          )}
        </div>
      ),
    },
    {
      title: t("admin.invoices.table.actions"),
      key: "actions",
      width: 150,
      render: (_, r) => (
        <div className="flex items-center gap-1">
          <TableActionButton
            tooltip={t("admin.invoices.downloadPdf")}
            icon={<Download className="size-4" />}
            onClick={() => downloadPdf(r)}
            disabled={r.amount == null || r.amount <= 0}
          />
          {r.recordStatus === "active" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={revokingId === r.id}
              onClick={() => confirmRevoke(r)}
            >
              {revokingId === r.id ? (
                <Spinner size="sm" className="text-current" aria-hidden="true" />
              ) : (
                <Undo2 aria-hidden="true" />
              )}
              {t("admin.invoices.revoke")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:text-destructive"
              disabled={deletingId === r.id}
              onClick={() => confirmDelete(r)}
            >
              {deletingId === r.id ? (
                <Spinner size="sm" className="text-current" aria-hidden="true" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              {t("admin.invoices.delete")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.invoices.title")}
        subtitle={t("admin.invoices.subtitle")}
      />

      <Card className={isMobile ? "p-3" : "p-4"}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="relative" style={{ width: isMobile ? 160 : 280 }}>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="ps-9"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => navigate("/admin/payments")}>
            <Plus aria-hidden="true" />
            {!isMobile && t("admin.invoices.createButton")}
          </Button>
        </div>
        {isMobile ? (
          <ResponsiveCardView
            items={filtered.map((r) => ({
              id: `${r.accountId}-${r.id}`,
              title: r.accountName,
              subtitle: r.ownerEmail || "-",
              description: formatHistoryDateTime(r.createdAt),
              tags: [
                {
                  label: r.chargeType === "monthly" ? t("admin.invoices.typeMonthly") : t("admin.invoices.typeOneTime"),
                  color: r.chargeType === "monthly" ? "purple" : "blue",
                },
                paymentStatusBadge(t, r.paymentStatus),
                ...(r.recordStatus !== "active"
                  ? [{
                      label: r.recordStatus === "revoked" ? t("admin.invoices.statusRevoked") : t("admin.invoices.statusSuperseded"),
                      color: "default",
                    }]
                  : []),
              ],
              extra: (
                <div className="text-end">
                  <span className="text-sm font-semibold tabular-nums">
                    {r.amount != null ? formatMoney(r.amount, r.currency || "ILS") : "-"}
                  </span>
                  {r.chargeType === "monthly" && r.installmentMonths != null && r.installmentMonths >= 2 && r.installmentTotalAmount != null && (
                    <span className="block text-[10px] text-muted-foreground">
                      {t("admin.invoices.installmentNote", {
                        total: formatMoney(r.installmentTotalAmount, r.currency || "ILS"),
                        months: r.installmentMonths,
                      })}
                    </span>
                  )}
                </div>
              ),
              actions: [
                {
                  label: t("admin.invoices.downloadPdf"),
                  onClick: () => downloadPdf(r),
                  icon: <Download className="size-4" />,
                  type: "default" as const,
                },
                ...(r.recordStatus === "active"
                  ? [{
                      label: t("admin.invoices.revoke"),
                      onClick: () => confirmRevoke(r),
                    }]
                  : [{
                      label: t("admin.invoices.delete"),
                      onClick: () => confirmDelete(r),
                      danger: true,
                    }]),
              ],
            }))}
            loading={loading}
            emptyText={t("admin.invoices.emptyTitle")}
          />
        ) : (
          <DataTable<BillingHistoryWithAccountRow>
            columns={columns}
            dataSource={filtered}
            rowKey={(r) => `${r.accountId}-${r.id}`}
            loading={loading}
            size="middle"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 900 }}
            locale={{
              emptyText: search ? (
                <EmptyState title={t("common.noData")} />
              ) : (
                <EmptyState
                  title={t("admin.invoices.emptyTitle")}
                  description={t("admin.invoices.emptyDescription")}
                  action={{ label: t("admin.invoices.createButton"), onClick: () => navigate("/admin/payments") }}
                />
              ),
            }}
          />
        )}
      </Card>
    </PageContainer>
  );
}

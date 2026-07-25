/**
 * One client, one row — contracts and invoices in the same place.
 *
 * Grounded in Acctual's bills list (status tabs with counts, exposure stated in
 * red inside the row, muted column headers, no chrome) with the KPI semantics of
 * Runey's invoices dashboard reduced to the three numbers this business acts on.
 * Deliberately no revenue chart and no per-row avatars: there is no per-client
 * time series worth plotting here, and decoration is what made the existing
 * contracts/invoices/payments split hard to read in the first place.
 */
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { message } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useApp } from "../../../../app/AppProviders";
import type { Contract } from "../../../../domain/Contract";
import type { OpenInvoiceRow } from "../../../../services/admin/AdminService";
import { EmptyState } from "../../../shared/components/EmptyState";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponsiveCardView, useMobileView } from "../../../shared/components/ResponsiveCardView";
import { Paths } from "../../../navigation/paths";

type SubscriptionState = "active" | "past_due" | "completed" | "none";

interface ClientRow {
  accountId: number;
  name: string;
  email: string;
  /** Money demanded and still unpaid — the number this screen exists for. */
  openAmount: number;
  openCount: number;
  currency: string;
  contracts: Contract[];
  openInvoices: OpenInvoiceRow[];
  signedCount: number;
  draftCount: number;
  subscription: SubscriptionState;
  monthlyAmount: number | null;
  lastPaymentAt: string | null;
  lastPaymentAmount: number | null;
}

function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "ILS").toUpperCase(),
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function fmtDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function subscriptionBadge(state: SubscriptionState): [NonNullable<BadgeProps["variant"]>, string] {
  const map: Record<SubscriptionState, [NonNullable<BadgeProps["variant"]>, string]> = {
    active: ["success", "admin.clients.subscription.active"],
    past_due: ["error", "admin.clients.subscription.pastDue"],
    completed: ["default", "admin.clients.subscription.completed"],
    none: ["default", "admin.clients.subscription.none"],
  };
  return map[state];
}

export function AdminClientsPage() {
  const { t } = useTranslation();
  const { services, users } = useApp();
  const isMobile = useMobileView();
  const navigate = useNavigate();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoiceRow[]>([]);
  const [paidInvoices, setPaidInvoices] = useState<OpenInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "owing" | "subscribed" | "idle">("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      services.admin.listContracts(),
      services.admin.listRegistryInvoices({ status: "open" }),
      services.admin.listRegistryInvoices({ status: "paid" }),
    ])
      .then(([c, open, paid]) => {
        if (cancelled) return;
        setContracts(c);
        setOpenInvoices(open);
        setPaidInvoices(paid);
      })
      .catch((e: unknown) => {
        if (!cancelled) message.error(e instanceof Error ? e.message : t("errors.generic"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [services.admin, t]);

  const rows = useMemo<ClientRow[]>(() => {
    const byAccount = new Map<number, ClientRow>();

    const ensure = (accountId: number): ClientRow => {
      let row = byAccount.get(accountId);
      if (!row) {
        const user = users.find((u) => u.accountId === accountId);
        row = {
          accountId,
          name: user?.displayName || user?.email || `#${accountId}`,
          email: user?.email ?? "",
          openAmount: 0,
          openCount: 0,
          currency: "ILS",
          contracts: [],
          openInvoices: [],
          signedCount: 0,
          draftCount: 0,
          subscription: "none",
          monthlyAmount: null,
          lastPaymentAt: null,
          lastPaymentAmount: null,
        };
        byAccount.set(accountId, row);
      }
      return row;
    };

    users
      .filter((u) => u.role !== "admin" && u.accountId != null && u.accountId > 0)
      .forEach((u) => ensure(u.accountId as number));

    contracts.forEach((c) => {
      const row = ensure(c.accountId);
      if (c.status === "voided") return;
      row.contracts.push(c);
      row.currency = c.currency || row.currency;
      if (c.status === "signed") row.signedCount += 1;
      if (c.status === "draft" || c.status === "pending_signature") row.draftCount += 1;
      if (c.monthlyAmount && c.monthlyAmount > 0) {
        row.monthlyAmount = c.monthlyAmount;
        if (row.subscription === "none") row.subscription = "active";
      }
    });

    openInvoices.forEach((inv) => {
      if (inv.accountId == null) return;
      const row = ensure(inv.accountId);
      row.openInvoices.push(inv);
      row.openAmount += inv.amount;
      row.openCount += 1;
      row.currency = inv.currency || row.currency;
    });

    paidInvoices.forEach((inv) => {
      if (inv.accountId == null) return;
      const row = ensure(inv.accountId);
      const at = inv.paidAt ?? inv.createdAt;
      if (!at) return;
      if (!row.lastPaymentAt || new Date(at) > new Date(row.lastPaymentAt)) {
        row.lastPaymentAt = at;
        row.lastPaymentAmount = inv.amount;
      }
    });

    return [...byAccount.values()].sort((a, b) => b.openAmount - a.openAmount);
  }, [contracts, openInvoices, paidInvoices, users]);

  const totals = useMemo(() => {
    const open = rows.reduce((sum, r) => sum + r.openAmount, 0);
    const openCount = rows.reduce((sum, r) => sum + r.openCount, 0);
    const now = new Date();
    const collected = paidInvoices
      .filter((inv) => {
        const at = inv.paidAt ?? inv.createdAt;
        if (!at) return false;
        const d = new Date(at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, inv) => sum + inv.amount, 0);
    const subscribed = rows.filter((r) => r.subscription === "active").length;
    return { open, openCount, collected, subscribed };
  }, [rows, paidInvoices]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      owing: rows.filter((r) => r.openCount > 0).length,
      subscribed: rows.filter((r) => r.subscription === "active").length,
      idle: rows.filter((r) => r.contracts.length === 0 && r.openCount === 0).length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === "owing" && r.openCount === 0) return false;
      if (tab === "subscribed" && r.subscription !== "active") return false;
      if (tab === "idle" && (r.contracts.length > 0 || r.openCount > 0)) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    });
  }, [rows, search, tab]);

  const columns: DataTableColumn<ClientRow>[] = [
    {
      title: t("admin.clients.columns.client"),
      key: "client",
      render: (_, r) => (
        <div>
          <div className="font-semibold">{r.name}</div>
          {r.email && <div className="text-xs text-(--ds-text-tertiary)">{r.email}</div>}
        </div>
      ),
    },
    {
      title: t("admin.clients.columns.owed"),
      key: "owed",
      align: "end",
      onCell: () => ({ className: "tabular-nums" }),
      render: (_, r) =>
        r.openCount === 0 ? (
          <span className="text-sm text-(--ds-text-tertiary)">—</span>
        ) : (
          <div className="text-end">
            <div className="font-semibold text-(--ds-color-error,#dc2626)">
              {fmtMoney(r.openAmount, r.currency)}
            </div>
            <div className="mt-0.5 text-xs text-(--ds-text-tertiary)">
              {t("admin.clients.openInvoices", { count: r.openCount })}
            </div>
          </div>
        ),
    },
    {
      title: t("admin.clients.columns.contracts"),
      key: "contracts",
      responsive: ["md"],
      render: (_, r) =>
        r.contracts.length === 0 ? (
          <span className="text-sm text-(--ds-text-tertiary)">—</span>
        ) : (
          <div className="text-sm">
            <span>{t("admin.clients.signedCount", { count: r.signedCount })}</span>
            {r.draftCount > 0 && (
              <span className="text-(--ds-text-tertiary)">
                {" · "}
                {t("admin.clients.draftCount", { count: r.draftCount })}
              </span>
            )}
          </div>
        ),
    },
    {
      title: t("admin.clients.columns.subscription"),
      key: "subscription",
      responsive: ["lg"],
      render: (_, r) => {
        if (r.subscription === "none") {
          return <span className="text-sm text-(--ds-text-tertiary)">—</span>;
        }
        const [variant, key] = subscriptionBadge(r.subscription);
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={variant}>{t(key)}</Badge>
            {r.monthlyAmount != null && (
              <span className="text-xs tabular-nums text-(--ds-text-tertiary)">
                {t("admin.clients.perMonth", { amount: fmtMoney(r.monthlyAmount, r.currency) })}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: t("admin.clients.columns.lastPayment"),
      key: "lastPayment",
      align: "end",
      responsive: ["lg"],
      onCell: () => ({ className: "tabular-nums" }),
      render: (_, r) =>
        r.lastPaymentAt ? (
          <div className="text-end">
            <div className="text-sm">{fmtDate(r.lastPaymentAt)}</div>
            {r.lastPaymentAmount != null && (
              <div className="mt-0.5 text-xs text-(--ds-text-tertiary)">
                {fmtMoney(r.lastPaymentAmount, r.currency)}
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm text-(--ds-text-tertiary)">
            {t("admin.clients.neverPaid")}
          </span>
        ),
    },
  ];

  const expandedRow = (r: ClientRow) => (
    <div className="grid grid-cols-1 gap-5 py-1 lg:grid-cols-2">
      <div>
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-(--ds-text-tertiary)">
          {t("admin.clients.contractsTitle")}
        </span>
        {r.contracts.length === 0 ? (
          <span className="text-sm text-(--ds-text-tertiary)">{t("admin.clients.noContracts")}</span>
        ) : (
          <div className="flex flex-col">
            {r.contracts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(Paths.adminContracts)}
                className={cn(
                  "flex items-center justify-between gap-3 border-b border-(--ds-border-subtle) py-2 text-start",
                  "last:border-b-0 hover:bg-(--ds-surface-2)",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{c.title}</span>
                  <span className="text-xs text-(--ds-text-tertiary)">
                    {t(`admin.clients.paymentStatus.${c.paymentStatus ?? "unpaid"}`)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {fmtMoney(c.contractValue ?? c.totalAmount, c.currency)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-(--ds-text-tertiary)">
          {t("admin.clients.openInvoicesTitle")}
        </span>
        {r.openInvoices.length === 0 ? (
          <span className="text-sm text-(--ds-text-tertiary)">
            {t("admin.clients.noOpenInvoices")}
          </span>
        ) : (
          <div className="flex flex-col">
            {r.openInvoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3 border-b border-(--ds-border-subtle) py-2 last:border-b-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {inv.description || t(`admin.clients.source.${inv.sourceType}`)}
                  </span>
                  <span className="text-xs text-(--ds-text-tertiary)">{fmtDate(inv.createdAt)}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-(--ds-color-error,#dc2626)">
                  {fmtMoney(inv.amount, inv.currency)}
                </span>
              </div>
            ))}
            <span className="mt-2 block text-xs text-(--ds-text-tertiary)">
              {t("admin.clients.linkWarning")}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <PageContainer>
      <PageHeader title={t("admin.clients.title")} subtitle={t("admin.clients.subtitle")} />

      {/* The three numbers this business acts on — no chart, there is no series worth plotting */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <span className="block text-xs text-(--ds-text-tertiary)">
            {t("admin.clients.kpiOpen")}
          </span>
          <span className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-(--ds-color-error,#dc2626)">
              {fmtMoney(totals.open, "ILS")}
            </span>
            <span className="text-xs text-(--ds-text-tertiary)">
              {t("admin.clients.openInvoices", { count: totals.openCount })}
            </span>
          </span>
        </Card>
        <Card className="p-4">
          <span className="block text-xs text-(--ds-text-tertiary)">
            {t("admin.clients.kpiCollected")}
          </span>
          <span className="mt-1 block text-2xl font-semibold tabular-nums">
            {fmtMoney(totals.collected, "ILS")}
          </span>
        </Card>
        <Card className="p-4">
          <span className="block text-xs text-(--ds-text-tertiary)">
            {t("admin.clients.kpiSubscriptions")}
          </span>
          <span className="mt-1 flex items-center gap-2">
            <RefreshCw aria-hidden="true" className="size-4 text-(--ds-color-primary)" />
            <span className="text-2xl font-semibold tabular-nums">{totals.subscribed}</span>
          </span>
        </Card>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          options={[
            { value: "all", label: `${t("admin.clients.tabs.all")} · ${counts.all}` },
            { value: "owing", label: `${t("admin.clients.tabs.owing")} · ${counts.owing}` },
            { value: "subscribed", label: `${t("admin.clients.tabs.subscribed")} · ${counts.subscribed}` },
            { value: "idle", label: `${t("admin.clients.tabs.idle")} · ${counts.idle}` },
          ]}
        />
        <div className="relative" style={{ width: isMobile ? 160 : 280 }}>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="ps-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.clients.searchPlaceholder")}
          />
        </div>
      </div>

      {totals.open > 0 && (
        <div
          className="mb-3 flex items-start gap-2 rounded-md px-3.5 py-2.5"
          style={{
            background: "var(--ds-color-warning-surface, rgba(245, 158, 11, 0.08))",
            border: "1px solid rgba(245, 158, 11, 0.35)",
          }}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-(--ds-color-warning,#d97706)" />
          <span className="text-xs text-(--ds-text-secondary)">
            {t("admin.clients.exposureNote")}
          </span>
        </div>
      )}

      {isMobile ? (
        <ResponsiveCardView
          loading={loading}
          emptyText={t("admin.clients.emptyTitle")}
          items={filtered.map((r) => ({
            id: r.accountId,
            title: r.name,
            subtitle: r.email || "—",
            description:
              r.openCount > 0
                ? t("admin.clients.openInvoices", { count: r.openCount })
                : t("admin.clients.noOpenInvoices"),
            tags: [
              ...(r.subscription !== "none"
                ? [{ label: t(subscriptionBadge(r.subscription)[1]), color: r.subscription === "active" ? "green" : "red" }]
                : []),
              ...(r.contracts.length
                ? [{ label: t("admin.clients.signedCount", { count: r.signedCount }), color: "default" }]
                : []),
            ],
            extra: (
              <span className="text-end">
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    r.openCount > 0 && "text-(--ds-color-error,#dc2626)",
                  )}
                >
                  {r.openCount > 0 ? fmtMoney(r.openAmount, r.currency) : "—"}
                </span>
              </span>
            ),
          }))}
        />
      ) : (
        <DataTable<ClientRow>
          columns={columns}
          dataSource={filtered}
          rowKey={(r) => r.accountId}
          loading={loading}
          size="middle"
          pagination={filtered.length > 20 ? { pageSize: 20 } : false}
          expandable={{
            expandedRowRender: expandedRow,
            rowExpandable: (r) => r.contracts.length > 0 || r.openInvoices.length > 0,
          }}
          locale={{
            emptyText: (
              <EmptyState
                title={t("admin.clients.emptyTitle")}
                description={t("admin.clients.emptyDescription")}
              />
            ),
          }}
        />
      )}
    </PageContainer>
  );
}

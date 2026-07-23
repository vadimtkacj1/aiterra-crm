import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ChevronsUpDown,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import type { TFunction } from "i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { MenuDropdown } from "@/components/ui/menu-compat";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { message } from "@/lib/toast";
import { useIsMobile } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import type { CampaignAnalyticsSnapshot, CampaignSummaryRow } from "@/domain/CampaignAnalytics";
import { accountCampaignPath, Paths } from "@/ui/navigation/paths";
import {
  classifyCampaignObjective,
  getPrimaryGoalDisplay,
  goalKindI18nKey,
  primaryGoalSortValue,
  type CampaignGoalKind,
} from "../utils/campaignObjective";
import { EmptyState } from "@/ui/shared/components/EmptyState";
import { exportCampaignListCsv, exportCampaignListPdf } from "../utils/exportUtils";
import { DateRangeControl, rangeParam, type DateRange } from "./DateRangeControl";
import { KpiStatCard } from "./KpiStatCard";

type StatusFilter = "ALL" | "ACTIVE" | "PAUSED";

function getTotalGoalLabel(data: CampaignAnalyticsSnapshot, t: TFunction): { label: string; value: string } {
  const rows = data.rows;
  if (!rows.length) {
    return { label: t("meta.result.conversions"), value: data.totals.conversions.toLocaleString() };
  }

  const kinds = rows.map((r) => classifyCampaignObjective(r.objective));
  const uniq = new Set(kinds);
  if (uniq.size > 1) {
    return { label: t("meta.panel.goalMixed"), value: t("meta.panel.goalMixedValue") };
  }

  const kind: CampaignGoalKind = kinds[0] ?? "general";
  switch (kind) {
    case "leads":
      return { label: t("meta.panel.portfolioLeads"), value: (data.totals.leads ?? 0).toLocaleString() };
    case "sales": {
      const roas = (data.totals.roas ?? 0).toFixed(2);
      const purchases = data.totals.purchases ?? 0;
      return { label: t("meta.panel.portfolioSales"), value: `${purchases.toLocaleString()} · ${roas}x` };
    }
    case "engagement": {
      const pe = data.totals.postEngagement ?? 0;
      const vv = data.totals.videoViews ?? 0;
      if (vv > pe) {
        return { label: t("meta.panel.portfolioVideoViews"), value: vv.toLocaleString() };
      }
      return { label: t("meta.panel.portfolioEngagement"), value: pe.toLocaleString() };
    }
    case "traffic":
      return {
        label: t("meta.panel.portfolioLinkClicks"),
        value: (data.totals.linkClicks ?? 0).toLocaleString(),
      };
    default:
      return { label: t("meta.result.conversions"), value: data.totals.conversions.toLocaleString() };
  }
}

function statusVariant(status: string): "success" | "warning" | "default" | "processing" {
  switch ((status ?? "").toUpperCase()) {
    case "ACTIVE": return "success";
    case "PAUSED": return "warning";
    case "DELETED":
    case "ARCHIVED": return "default";
    default: return "processing";
  }
}

function goalKindClass(kind: CampaignGoalKind): string {
  switch (kind) {
    case "leads":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "sales":
      return "border-green-200 bg-green-50 text-green-700";
    case "engagement":
      return "border-purple-200 bg-purple-50 text-purple-700";
    case "traffic":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    default:
      return "";
  }
}

/* ── Client-side sorting (replaces the antd Table `sorter` behavior) ────── */
type SortDir = "ascend" | "descend";
interface SortState { key: string; dir: SortDir }

function SortTitle({
  label,
  colKey,
  sort,
  onSort,
}: {
  label: React.ReactNode;
  colKey: string;
  sort: SortState | null;
  onSort: (key: string) => void;
}) {
  const active = sort?.key === colKey;
  return (
    <button
      type="button"
      onClick={() => onSort(colKey)}
      className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground"
    >
      {label}
      {active
        ? sort!.dir === "ascend"
          ? <ArrowUp aria-hidden="true" className="size-3" />
          : <ArrowDown aria-hidden="true" className="size-3" />
        : <ChevronsUpDown aria-hidden="true" className="size-3 opacity-40" />}
    </button>
  );
}

interface MetaCampaignListPanelProps {
  load: (since?: string, until?: string) => Promise<CampaignAnalyticsSnapshot>;
}

export function MetaCampaignListPanel({ load }: MetaCampaignListPanelProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CampaignAnalyticsSnapshot | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [sort, setSort] = useState<SortState | null>({ key: "spend", dir: "descend" });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await load(rangeParam(dateRange?.[0]), rangeParam(dateRange?.[1]));
      setData(snap);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("analytics.loadError"));
    } finally {
      setLoading(false);
    }
    // t only feeds the error path; matching the previous ref-based behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, dateRange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sorters = useMemo<Record<string, (a: CampaignSummaryRow, b: CampaignSummaryRow) => number>>(
    () => ({
      name: (a, b) => a.campaignName.localeCompare(b.campaignName),
      goalKind: (a, b) => {
        const ka = goalKindI18nKey(classifyCampaignObjective(a.objective));
        const kb = goalKindI18nKey(classifyCampaignObjective(b.objective));
        return ka.localeCompare(kb);
      },
      status: (a, b) => (a.status ?? "").localeCompare(b.status ?? ""),
      spend: (a, b) => a.spend - b.spend,
      result: (a, b) => primaryGoalSortValue(a) - primaryGoalSortValue(b),
      impr: (a, b) => a.impressions - b.impressions,
      ctr: (a, b) => a.ctr - b.ctr,
    }),
    [],
  );

  const toggleSort = useCallback((key: string) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "ascend" ? "descend" : "ascend" }
        : { key, dir: "ascend" },
    );
  }, []);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    let rows = data.rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.campaignName.toLowerCase().includes(q));
    }
    if (statusFilter !== "ALL") {
      rows = rows.filter((r) => (r.status ?? "ACTIVE").toUpperCase() === statusFilter);
    }
    if (sort && sorters[sort.key]) {
      rows = [...rows].sort(sorters[sort.key]);
      if (sort.dir === "descend") rows.reverse();
    }
    return rows;
  }, [data, search, statusFilter, sort, sorters]);

  const currency = data?.currency ?? "";
  const goalMetric = data ? getTotalGoalLabel(data, t) : null;

  const columns: DataTableColumn<CampaignSummaryRow>[] = useMemo(() => {
    const sortTitle = (label: React.ReactNode, key: string) => (
      <SortTitle label={label} colKey={key} sort={sort} onSort={toggleSort} />
    );

    const actionCol: DataTableColumn<CampaignSummaryRow> = {
      title: "",
      key: "action",
      width: 40,
      render: (_: unknown, row: CampaignSummaryRow) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={t("meta.deepdive.backToCampaigns")}
          onClick={(e) => {
            e.stopPropagation();
            if (accountId) navigate(accountCampaignPath(accountId, row.campaignId));
          }}
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      ),
    };

    if (isMobile) {
      return [
        {
          title: sortTitle(t("analytics.table.campaign"), "name"),
          dataIndex: "campaignName",
          key: "name",
          render: (name: unknown, row: CampaignSummaryRow) => (
            <div className="flex flex-col gap-0.5">
              <span className="truncate text-[13px] font-semibold">{name as string}</span>
              <div className="flex flex-wrap gap-1">
                <Badge
                  variant={statusVariant(row.status ?? "ACTIVE")}
                  className="px-1 py-0 text-[10px] leading-4"
                >
                  {(row.status ?? "ACTIVE").toUpperCase()}
                </Badge>
                {row.objective && (
                  <Badge
                    className={cn(
                      "px-1 py-0 text-[10px] leading-4",
                      goalKindClass(classifyCampaignObjective(row.objective)),
                    )}
                  >
                    {t(goalKindI18nKey(classifyCampaignObjective(row.objective)))}
                  </Badge>
                )}
              </div>
            </div>
          ),
        },
        {
          title: sortTitle(t("analytics.table.spend"), "spend"),
          dataIndex: "spend",
          key: "spend",
          width: 90,
          render: (v: unknown) => (
            <span className="text-xs font-semibold tabular-nums">{(v as number).toFixed(0)} {currency}</span>
          ),
        },
        {
          title: sortTitle(t("meta.panel.result"), "result"),
          key: "result",
          width: 80,
          render: (_: unknown, row: CampaignSummaryRow) => {
            const m = getPrimaryGoalDisplay(row, t);
            return (
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold tabular-nums">{m.value}</span>
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
            );
          },
        },
        actionCol,
      ];
    }

    return [
      {
        title: sortTitle(t("analytics.table.campaign"), "name"),
        dataIndex: "campaignName",
        key: "name",
        render: (name: unknown, row: CampaignSummaryRow) => (
          <div className="flex flex-col gap-0.5">
            <span className="truncate font-semibold">{name as string}</span>
            {row.objective && (
              <Badge
                className={cn(
                  "w-fit px-1 py-0 text-[10px] leading-4",
                  goalKindClass(classifyCampaignObjective(row.objective)),
                )}
              >
                {row.objective.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
            )}
          </div>
        ),
      },
      {
        title: sortTitle(t("meta.panel.goalType"), "goalKind"),
        key: "goalKind",
        width: 120,
        render: (_: unknown, row: CampaignSummaryRow) => {
          const kind = classifyCampaignObjective(row.objective);
          return (
            <Badge className={goalKindClass(kind)}>
              {t(goalKindI18nKey(kind))}
            </Badge>
          );
        },
      },
      {
        title: sortTitle(t("meta.panel.status"), "status"),
        dataIndex: "status",
        key: "status",
        width: 100,
        render: (s: unknown) => (
          <Badge variant={statusVariant(s as string)}>{((s as string) ?? "-").toUpperCase()}</Badge>
        ),
      },
      {
        title: sortTitle(t("analytics.table.spend"), "spend"),
        dataIndex: "spend",
        key: "spend",
        width: 120,
        render: (v: unknown) => (
          <span className="font-semibold tabular-nums">{(v as number).toFixed(2)} {currency}</span>
        ),
      },
      {
        title: sortTitle(t("meta.panel.result"), "result"),
        key: "result",
        width: 200,
        render: (_: unknown, row: CampaignSummaryRow) => {
          const m = getPrimaryGoalDisplay(row, t);
          return (
            <div className="flex flex-col">
              <span className="font-semibold tabular-nums">{m.value}</span>
              <span className="text-[11px] text-muted-foreground">{m.label}</span>
            </div>
          );
        },
      },
      {
        title: sortTitle(t("analytics.table.impressions"), "impr"),
        dataIndex: "impressions",
        key: "impr",
        width: 120,
        render: (v: unknown) => <span className="tabular-nums">{(v as number).toLocaleString()}</span>,
      },
      {
        title: sortTitle(t("analytics.table.ctr"), "ctr"),
        dataIndex: "ctr",
        key: "ctr",
        width: 90,
        render: (v: unknown) => <span className="tabular-nums">{`${(v as number).toFixed(2)}%`}</span>,
      },
      actionCol,
    ];
  }, [t, currency, accountId, navigate, isMobile, sort, toggleSort]);

  const updatedAtText = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null;

  if (loading && !data) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((k) => (
            <Card key={k} className="p-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-7 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
            <Skeleton key={k} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (data && data.rows.length === 0 && !search && statusFilter === "ALL") {
    return (
      <Card>
        <EmptyState
          title={t("analytics.empty.title")}
          description={t("analytics.empty.description")}
          action={{ label: t("common.reload"), onClick: () => void refresh() }}
          secondaryAction={{ label: t("analytics.empty.openHelp"), onClick: () => navigate(Paths.help) }}
        />
      </Card>
    );
  }

  const exportDisabled = !data || filteredRows.length === 0;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Top KPI bar */}
      {data && goalMetric && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiStatCard
            title={t("analytics.stats.spend")}
            value={data.totals.spend}
            suffix={currency}
            precision={2}
          />
          {goalMetric.value !== "0" && (
            <KpiStatCard title={goalMetric.label} value={goalMetric.value} />
          )}
          <KpiStatCard title={t("analytics.stats.impressions")} value={data.totals.impressions} />
        </div>
      )}

      {/* Campaign list: toolbar + table in one card */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className={cn("relative", isMobile ? "w-full" : "w-[220px]")}>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder={t("meta.panel.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-8 pe-8"
                />
                {search && (
                  <button
                    type="button"
                    aria-label={t("common.clear", { defaultValue: "Clear" })}
                    onClick={() => setSearch("")}
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                )}
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("meta.panel.filterAll")}</SelectItem>
                  <SelectItem value="ACTIVE">{t("meta.panel.filterActive")}</SelectItem>
                  <SelectItem value="PAUSED">{t("meta.panel.filterPaused")}</SelectItem>
                </SelectContent>
              </Select>
              <DateRangeControl value={dateRange} onChange={setDateRange} className={isMobile ? "w-full" : undefined} />
            </div>
            <div className="flex items-center gap-2">
              {updatedAtText && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                  <RefreshCw aria-hidden="true" className="size-3" />
                  {t("meta.panel.updatedAt", { time: updatedAtText })}
                </span>
              )}
              <MenuDropdown
                disabled={exportDisabled}
                align="end"
                items={[
                  {
                    key: "csv",
                    icon: <FileSpreadsheet aria-hidden="true" className="size-4" />,
                    label: t("meta.panel.exportCsv"),
                    onClick: () => data && exportCampaignListCsv(filteredRows, currency),
                  },
                  {
                    key: "pdf",
                    icon: <FileText aria-hidden="true" className="size-4" />,
                    label: t("meta.panel.exportPdf"),
                    onClick: () => data && exportCampaignListPdf(filteredRows, currency, data.periodLabel),
                  },
                ]}
              >
                <Button variant="outline" disabled={exportDisabled}>
                  <Download aria-hidden="true" />
                  {!isMobile && t("meta.panel.export")}
                </Button>
              </MenuDropdown>
              <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
                {loading
                  ? <Spinner size="sm" className="text-current" aria-hidden="true" />
                  : <RefreshCw aria-hidden="true" />}
                {!isMobile && t("common.reload")}
              </Button>
            </div>
          </div>

          <div dir="ltr">
            <DataTable<CampaignSummaryRow>
              loading={loading}
              rowKey="campaignId"
              size="middle"
              dataSource={filteredRows}
              columns={columns}
              pagination={{ pageSize: 25 }}
              locale={{
                emptyText:
                  statusFilter !== "ALL" ? (
                    <EmptyState
                      title={t("meta.panel.noFilteredCampaigns")}
                      action={{
                        label: t("meta.panel.showAllStatuses"),
                        onClick: () => setStatusFilter("ALL"),
                        type: "default",
                      }}
                      style={{ padding: "24px 0" }}
                    />
                  ) : (
                    <EmptyState title={t("analytics.empty.title")} style={{ padding: "24px 0" }} />
                  ),
              }}
              onRow={(row) => ({
                onClick: () => {
                  if (accountId) navigate(accountCampaignPath(accountId, row.campaignId));
                },
                style: { cursor: "pointer" },
              })}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

import type { ReactNode } from "react";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { MenuDropdown } from "@/components/ui/menu-compat";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { message } from "@/lib/toast";
import { useIsMobile } from "@/lib/use-media-query";
import type { CampaignAdsData, CampaignAnalyticsSnapshot, CampaignSummaryRow } from "@/domain/CampaignAnalytics";
import { useApp } from "@/app/AppProviders";
import { accountPath } from "@/ui/navigation/paths";
import { UserContentLayout } from "@/ui/shared/components/UserContentLayout";
import { CampaignCreativeGallery } from "../components/CampaignCreativeGallery";
import { DateRangeControl, rangeParam, type DateRange } from "../components/DateRangeControl";
import { KpiStatCard } from "../components/KpiStatCard";
import {
  classifyCampaignObjective,
  getCostPerPrimaryGoal,
  getPrimaryGoalDisplay,
  type CampaignGoalKind,
} from "../utils/campaignObjective";
import { exportCampaignDetailCsv, exportCampaignDetailPdf } from "../utils/exportUtils";

// All available metric columns for the "Manage Columns" feature
const ALL_COLUMNS = [
  "impressions", "clicks", "ctr", "spend", "reach", "frequency",
  "cpc", "cpm", "leads", "purchases", "roas", "purchaseValue",
  "inlineLinkClicks", "linkClicks", "postEngagement", "videoViews",
  "uniqueClicks", "outboundClicks",
] as const;

type MetricCol = typeof ALL_COLUMNS[number];

const FALLBACK_COLUMNS: MetricCol[] = ["impressions", "clicks", "ctr", "spend", "leads", "purchases", "roas", "reach"];

function defaultColumnsForKind(kind: CampaignGoalKind): MetricCol[] {
  const base: MetricCol[] = ["impressions", "clicks", "ctr", "spend", "reach"];
  switch (kind) {
    case "leads":
      return [...base, "leads", "cpc", "cpm"];
    case "sales":
      return [...base, "purchases", "roas", "purchaseValue"];
    case "engagement":
      return [...base, "postEngagement", "videoViews", "frequency"];
    case "traffic":
      return [...base, "linkClicks", "cpc"];
    default:
      return [...FALLBACK_COLUMNS];
  }
}

export function MetaCampaignDeepDivePage() {
  const { t } = useTranslation();
  const { services } = useApp();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { accountId, campaignId } = useParams<{ accountId: string; campaignId: string }>();

  const [loading, setLoading] = useState(true);
  const [adsLoading, setAdsLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<CampaignAnalyticsSnapshot | null>(null);
  const [adsData, setAdsData] = useState<CampaignAdsData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [activeColumns, setActiveColumns] = useState<MetricCol[]>(FALLBACK_COLUMNS);
  const [manageOpen, setManageOpen] = useState(false);
  const prevDetailCampaignId = useRef<string | undefined>(undefined);

  const since = rangeParam(dateRange?.[0]);
  const until = rangeParam(dateRange?.[1]);

  const campaign = useMemo(
    () => snapshot?.rows.find((r) => r.campaignId === campaignId) ?? null,
    [snapshot, campaignId],
  );

  useEffect(() => {
    if (!campaignId || !campaign) return;
    if (prevDetailCampaignId.current === campaignId) return;
    prevDetailCampaignId.current = campaignId;
    setActiveColumns(defaultColumnsForKind(classifyCampaignObjective(campaign.objective)));
  }, [campaignId, campaign]);

  const loadSnapshot = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const snap = await services.metaAnalytics.fetchSnapshot(accountId, since, until);
      setSnapshot(snap);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("analytics.loadError"));
    } finally {
      setLoading(false);
    }
  }, [accountId, since, until, services.metaAnalytics, t]);

  const loadAds = useCallback(async () => {
    if (!accountId || !campaignId) return;
    setAdsLoading(true);
    try {
      const ads = await services.metaAnalytics.fetchCampaignAds(accountId, campaignId, since, until);
      setAdsData(ads);
    } catch {
      // Creative data is best-effort; don't surface error
    } finally {
      setAdsLoading(false);
    }
  }, [accountId, campaignId, since, until, services.metaAnalytics]);

  useEffect(() => {
    void loadSnapshot();
    void loadAds();
  }, [loadSnapshot, loadAds]);

  const currency = snapshot?.currency ?? "";
  const mainGoal = campaign ? getPrimaryGoalDisplay(campaign, t) : null;
  const costPerResult = campaign ? getCostPerPrimaryGoal(campaign, t) : null;

  const tableData = campaign ? [campaign] : [];

  // Columns where every row has value 0: skip them to avoid noise
  const zeroColumns = useMemo<Set<MetricCol>>(() => {
    if (!campaign) return new Set();
    const numericKey: Partial<Record<MetricCol, keyof CampaignSummaryRow>> = {
      leads: "leads", purchases: "purchases", roas: "roas", purchaseValue: "purchaseValue",
      postEngagement: "postEngagement", videoViews: "videoViews", linkClicks: "linkClicks",
      inlineLinkClicks: "inlineLinkClicks",
      uniqueClicks: "uniqueClicks", outboundClicks: "outboundClicks", frequency: "frequency",
    };
    const zeros = new Set<MetricCol>();
    for (const [col, field] of Object.entries(numericKey) as [MetricCol, keyof CampaignSummaryRow][]) {
      if (!((campaign[field] as number | undefined) ?? 0)) zeros.add(col);
    }
    return zeros;
  }, [campaign]);

  // Dynamic column factory
  const metricsColumns: DataTableColumn<CampaignSummaryRow>[] = useMemo(() => {
    const fmt = (v: number | undefined, dec = 0) =>
      dec > 0 ? (v ?? 0).toFixed(dec) : (v ?? 0).toLocaleString();

    const colDefs: Record<MetricCol, { title: string; width: number; render: (row: CampaignSummaryRow) => ReactNode }> = {
      impressions: { title: t("analytics.table.impressions"), width: 120, render: (r) => fmt(r.impressions) },
      clicks: { title: t("analytics.table.clicks"), width: 90, render: (r) => fmt(r.clicks) },
      ctr: { title: t("analytics.table.ctr"), width: 80, render: (r) => `${fmt(r.ctr, 2)}%` },
      spend: { title: t("analytics.table.spend"), width: 110, render: (r) => `${fmt(r.spend, 2)} ${currency}` },
      reach: { title: t("analytics.table.reach"), width: 100, render: (r) => fmt(r.reach) },
      frequency: { title: t("analytics.table.frequency"), width: 100, render: (r) => fmt(r.frequency, 2) },
      cpc: { title: t("analytics.table.cpc"), width: 100, render: (r) => `${fmt(r.cpc, 4)} ${currency}` },
      cpm: { title: t("analytics.table.cpm"), width: 100, render: (r) => `${fmt(r.cpm, 4)} ${currency}` },
      leads: { title: t("meta.deepdive.leads"), width: 80, render: (r) => fmt(r.leads) },
      purchases: { title: t("meta.deepdive.purchases"), width: 100, render: (r) => fmt(r.purchases) },
      roas: { title: "ROAS", width: 80, render: (r) => `${fmt(r.roas, 2)}x` },
      purchaseValue: { title: t("meta.deepdive.purchaseValue"), width: 120, render: (r) => `${fmt(r.purchaseValue, 2)} ${currency}` },
      inlineLinkClicks: { title: t("analytics.table.inlineLinkClicks"), width: 140, render: (r) => fmt(r.inlineLinkClicks) },
      linkClicks: { title: t("analytics.table.linkClicks"), width: 120, render: (r) => fmt(r.linkClicks) },

      postEngagement: { title: t("analytics.table.postEngagement"), width: 130, render: (r) => fmt(r.postEngagement) },
      videoViews: { title: t("analytics.table.videoViews"), width: 130, render: (r) => fmt(r.videoViews) },
      uniqueClicks: { title: t("analytics.table.uniqueClicks"), width: 120, render: (r) => fmt(r.uniqueClicks) },
      outboundClicks: { title: t("analytics.table.outboundClicks"), width: 130, render: (r) => fmt(r.outboundClicks) },
    };

    const cols: DataTableColumn<CampaignSummaryRow>[] = [
      {
        title: t("analytics.table.campaign"),
        dataIndex: "campaignName",
        key: "name",
        width: 220,
        render: (v) => (
          <span className="block max-w-[220px] truncate" title={String(v ?? "")}>
            {v as string}
          </span>
        ),
      },
    ];

    for (const key of activeColumns) {
      if (zeroColumns.has(key)) continue;
      const def = colDefs[key];
      if (!def) continue;
      cols.push({
        title: def.title,
        key,
        width: def.width,
        render: (_: unknown, row: CampaignSummaryRow) => (
          <span className="tabular-nums">{def.render(row)}</span>
        ),
      });
    }

    return cols;
  }, [t, currency, activeColumns, zeroColumns]);

  if (loading && !snapshot) {
    return (
      <UserContentLayout>
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <Skeleton key={k} className="h-4 w-full" />
          ))}
        </div>
      </UserContentLayout>
    );
  }

  return (
    <UserContentLayout>
      <div className="flex w-full flex-col gap-6">
        {/* Page header: back link + campaign title + status tags */}
        <div>
          <div className="mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="-ms-2 text-(--ds-text-secondary)"
              onClick={() => navigate(accountPath(accountId ?? "", "meta"))}
            >
              <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
              {t("meta.deepdive.backToCampaigns")}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <h2
                className="m-0 truncate font-semibold"
                style={{ fontSize: isMobile ? 22 : 28 }}
              >
                {campaign?.campaignName ?? campaignId}
              </h2>
            </div>
            <div className="flex flex-wrap gap-1">
              {campaign?.objective && (
                <Badge>{campaign.objective.replace(/_/g, " ")}</Badge>
              )}
              {campaign?.status && (
                <Badge variant={campaign.status === "ACTIVE" ? "success" : "warning"}>
                  {campaign.status}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Top KPI cards */}
        {campaign && mainGoal && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiStatCard
              title={t("analytics.stats.spend")}
              value={campaign.spend}
              suffix={currency}
              precision={2}
            />
            {mainGoal.value !== "0" && (
              <KpiStatCard title={mainGoal.label} value={mainGoal.value} />
            )}
            <KpiStatCard title={t("analytics.stats.impressions")} value={campaign.impressions} />
            {costPerResult && (
              <KpiStatCard
                title={costPerResult.label}
                value={costPerResult.value}
                suffix={currency}
              />
            )}
          </div>
        )}

        {/* ── Creatives section (prominent, right after KPIs) ── */}
        <Separator />
        <div className="flex flex-col gap-4">
          <h5 className="m-0 text-base font-semibold">
            {t("meta.deepdive.creativesTitle")}
          </h5>
          <CampaignCreativeGallery
            ads={adsData?.ads ?? []}
            currency={adsData?.currency ?? currency}
            loading={adsLoading}
            objective={adsData?.objective ?? campaign?.objective ?? ""}
          />
        </div>

        {/* ── Detailed metrics: one card = toolbar + table ── */}
        <Separator />
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">{t("meta.deepdive.metricsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <DateRangeControl
                  value={dateRange}
                  onChange={setDateRange}
                  className={isMobile ? "w-full" : undefined}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setManageOpen(true)}>
                    <Settings aria-hidden="true" />
                    {!isMobile && t("meta.deepdive.manageColumns")}
                  </Button>
                  <MenuDropdown
                    disabled={!campaign}
                    align="end"
                    items={[
                      {
                        key: "csv",
                        icon: <FileSpreadsheet aria-hidden="true" className="size-4" />,
                        label: t("meta.panel.exportCsv"),
                        onClick: () =>
                          campaign &&
                          exportCampaignDetailCsv(campaign, currency, adsData?.ads ?? []),
                      },
                      {
                        key: "pdf",
                        icon: <FileText aria-hidden="true" className="size-4" />,
                        label: t("meta.panel.exportPdf"),
                        onClick: () =>
                          campaign &&
                          exportCampaignDetailPdf(
                            campaign,
                            currency,
                            adsData?.ads ?? [],
                            snapshot?.periodLabel,
                          ),
                      },
                    ]}
                  >
                    <Button variant="outline" disabled={!campaign}>
                      <Download aria-hidden="true" />
                      {!isMobile && t("meta.panel.export")}
                    </Button>
                  </MenuDropdown>
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => { void loadSnapshot(); void loadAds(); }}
                  >
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
                  dataSource={tableData}
                  columns={metricsColumns}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  locale={{ emptyText: t("common.noData") }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manage Columns Sheet */}
      <Sheet open={manageOpen} onOpenChange={setManageOpen}>
        <SheetContent className="w-80" closeLabel={t("common.close")}>
          <SheetHeader>
            <SheetTitle>{t("meta.deepdive.manageColumns")}</SheetTitle>
            <SheetDescription>{t("meta.deepdive.manageColumnsHint")}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3">
            {ALL_COLUMNS.map((col) => (
              <label key={col} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={activeColumns.includes(col)}
                  onCheckedChange={(checked) => {
                    if (checked === true) {
                      setActiveColumns((prev) => [...prev, col]);
                    } else {
                      setActiveColumns((prev) => prev.filter((c) => c !== col));
                    }
                  }}
                />
                {col.replace(/([A-Z])/g, " $1").trim()}
              </label>
            ))}
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setActiveColumns([...ALL_COLUMNS])}>
              {t("meta.deepdive.selectAll")}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                campaign &&
                setActiveColumns(defaultColumnsForKind(classifyCampaignObjective(campaign.objective)))
              }
            >
              {t("meta.deepdive.resetColumns")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </UserContentLayout>
  );
}

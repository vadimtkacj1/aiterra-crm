import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { message } from "@/lib/toast";
import { useIsMobile } from "@/lib/use-media-query";
import type { CampaignAnalyticsSnapshot, CampaignSummaryRow } from "@/domain/CampaignAnalytics";
import { EmptyState } from "@/ui/shared/components/EmptyState";
import { PageHeader } from "@/ui/shared/components/PageHeader";
import { CampaignCardList } from "./CampaignCardList";
import { CampaignSpendChart } from "./CampaignSpendChart";
import { CampaignMetricsCharts } from "./CampaignMetricsChart";
import { KpiStatCard } from "./KpiStatCard";

/** Min width per column; sum must be ≤ table min-width (horizontal scroll). */
const DESKTOP_COL_WIDTHS = [
  260, 120, 100, 96, 128, 116, 112, 104, 132, 132, 140, 128, 160, 116, 116, 152, 136, 136, 140, 140, 152,
] as const;
const TABLE_SCROLL_X =
  DESKTOP_COL_WIDTHS.reduce((a, w) => a + w, 0) + 72;

function isSnapshotEmpty(s: CampaignAnalyticsSnapshot): boolean {
  if (s.rows.length > 0) return false;
  const x = s.totals;
  return (
    (x.impressions ?? 0) === 0 &&
    (x.clicks ?? 0) === 0 &&
    (x.spend ?? 0) === 0 &&
    (x.conversions ?? 0) === 0
  );
}

interface CampaignAnalyticsPanelProps {
  title: string;
  description: string;
  load: () => Promise<CampaignAnalyticsSnapshot>;
}

export function CampaignAnalyticsPanel({ title, description, load }: CampaignAnalyticsPanelProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CampaignAnalyticsSnapshot | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await load();
      setData(snap);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("analytics.loadError"));
    } finally {
      setLoading(false);
    }
    // t is stable enough for the error path; matching the previous ref-based behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const periodText =
    data?.periodI18nKey != null && data.periodI18nKey.length > 0 ? t(data.periodI18nKey) : data?.periodLabel;

  const currency = data?.currency ?? "";

  const columns: DataTableColumn<CampaignSummaryRow>[] = useMemo(() => {
    const money = (v: number | undefined) => `${(v ?? 0).toFixed(4)} ${currency}`;
    const pct = (v: number | undefined) => (v ?? 0).toFixed(2);
    const int = (v: number | undefined) => (v ?? 0).toLocaleString();
    const [w0, w1, w2, w3, w4, w5, w6, w7, w8, w9, w10, w11, w12, w13, w14, w15, w16, w17, w18, w19, w20] =
      DESKTOP_COL_WIDTHS;

    return [
      {
        title: t("analytics.table.campaign"),
        dataIndex: "campaignName",
        key: "name",
        width: w0,
        render: (v) => (
          <span className="block truncate" style={{ maxWidth: w0 }} title={String(v ?? "")}>
            {v as string}
          </span>
        ),
      },
      {
        title: t("analytics.table.impressions"),
        dataIndex: "impressions",
        key: "impr",
        width: w1,
        render: (v) => int(v as number),
      },
      { title: t("analytics.table.clicks"), dataIndex: "clicks", key: "clk", width: w2, render: (v) => int(v as number) },
      {
        title: t("analytics.table.ctr"),
        dataIndex: "ctr",
        key: "ctr",
        width: w3,
        render: (v) => `${pct(v as number)}%`,
      },
      {
        title: t("analytics.table.spend"),
        dataIndex: "spend",
        key: "spend",
        width: w4,
        render: (v) => `${(v as number).toFixed(2)} ${currency}`,
      },
      { title: t("analytics.table.conversions"), dataIndex: "conversions", key: "conv", width: w5, render: (v) => int(v as number) },
      { title: t("analytics.table.reach"), dataIndex: "reach", key: "reach", width: w6, render: (v) => int(v as number) },
      {
        title: t("analytics.table.frequency"),
        dataIndex: "frequency",
        key: "freq",
        width: w7,
        render: (v) => pct(v as number | undefined),
      },
      {
        title: t("analytics.table.cpc"),
        dataIndex: "cpc",
        key: "cpc",
        width: w8,
        render: (v) => money(v as number | undefined),
      },
      {
        title: t("analytics.table.cpm"),
        dataIndex: "cpm",
        key: "cpm",
        width: w9,
        render: (v) => money(v as number | undefined),
      },
      {
        title: t("analytics.table.inlineLinkClicks"),
        dataIndex: "inlineLinkClicks",
        key: "ilc",
        width: w10,
        render: (v) => int(v as number | undefined),
      },
      {
        title: t("analytics.table.inlineLinkClickCtr"),
        dataIndex: "inlineLinkClickCtr",
        key: "ilctr",
        width: w11,
        render: (v) => `${pct(v as number | undefined)}%`,
      },
      {
        title: t("analytics.table.costPerInlineLinkClick"),
        dataIndex: "costPerInlineLinkClick",
        key: "cpilc",
        width: w12,
        render: (v) => money(v as number | undefined),
      },
      {
        title: t("analytics.table.uniqueClicks"),
        dataIndex: "uniqueClicks",
        key: "uq",
        width: w13,
        render: (v) => int(v as number | undefined),
      },
      {
        title: t("analytics.table.uniqueCtr"),
        dataIndex: "uniqueCtr",
        key: "uqctr",
        width: w14,
        render: (v) => `${pct(v as number | undefined)}%`,
      },
      {
        title: t("analytics.table.costPerUniqueClick"),
        dataIndex: "costPerUniqueClick",
        key: "cpuq",
        width: w15,
        render: (v) => money(v as number | undefined),
      },
      {
        title: t("analytics.table.outboundClicks"),
        dataIndex: "outboundClicks",
        key: "obc",
        width: w16,
        render: (v) => int(v as number | undefined),
      },
      {
        title: t("analytics.table.linkClicks"),
        dataIndex: "linkClicks",
        key: "lk",
        width: w17,
        render: (v) => int(v as number | undefined),
      },
      {
        title: t("analytics.table.landingPageViews"),
        dataIndex: "landingPageViews",
        key: "lpv",
        width: w18,
        render: (v) => int(v as number | undefined),
      },
      {
        title: t("analytics.table.postEngagement"),
        dataIndex: "postEngagement",
        key: "pe",
        width: w19,
        render: (v) => int(v as number | undefined),
      },
      {
        title: t("analytics.table.videoViews"),
        dataIndex: "videoViews",
        key: "vv",
        width: w20,
        render: (v) => int(v as number | undefined),
      },
    ];
  }, [t, currency]);

  const expandedRowRender = useCallback(
    (row: CampaignSummaryRow) => {
      const actions = row.actionBreakdown ?? [];
      if (actions.length === 0) {
        return (
          <span className="text-[13px] text-muted-foreground">
            {t("analytics.table.noActionsDetail")}
          </span>
        );
      }
      return (
        <div>
          <span className="mb-2 block text-[13px] font-semibold">
            {t("analytics.table.actionsDetail")}
          </span>
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <Badge key={`${row.campaignId}-${a.actionType}`} variant="default">
                {a.actionType}: {a.value.toLocaleString()}
              </Badge>
            ))}
          </div>
        </div>
      );
    },
    [t],
  );

  return (
    <div className="w-full">
      <PageHeader
        title={title}
        subtitle={description}
        actions={
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            {loading
              ? <Spinner size="sm" className="text-current" aria-hidden="true" />
              : <RefreshCw aria-hidden="true" />}
            {t("common.reload")}
          </Button>
        }
      />

      <div className="flex w-full flex-col gap-6">
      {loading && !data ? (
        <div className="flex w-full flex-col gap-6">
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((k) => (
              <Card key={k} className="p-4">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-7 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <Skeleton key={k} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ) : null}

      {data && isSnapshotEmpty(data) ? (
        <Card>
          <EmptyState
            title={t("analytics.empty.title")}
            description={t("analytics.empty.description")}
            action={{ label: t("common.reload"), onClick: () => void refresh(), loading }}
          />
        </Card>
      ) : null}

      {data && !isSnapshotEmpty(data) ? (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {periodText}
              {data.rows.length > 0 ? (
                <>
                  {" · "}
                  {t("analytics.table.rowCount", { count: data.rows.length })}
                </>
              ) : null}
            </span>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiStatCard title={t("analytics.stats.impressions")} value={data.totals.impressions} />
              <KpiStatCard title={t("analytics.stats.clicks")} value={data.totals.clicks} />
              <KpiStatCard
                title={t("analytics.stats.spend")}
                value={data.totals.spend}
                suffix={data.currency}
                precision={2}
              />
              <KpiStatCard title={t("analytics.stats.conversions")} value={data.totals.conversions} />
            </div>
          </div>

          <Accordion
            type="multiple"
            defaultValue={isMobile ? [] : ["more"]}
            className="rounded-xl bg-muted/60 px-4"
          >
            <AccordionItem value="more" className="border-b-0">
              <AccordionTrigger className="hover:no-underline">
                <span className="font-semibold">{t("analytics.table.moreMetrics")}</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiStatCard title={t("analytics.stats.reach")} value={data.totals.reach ?? 0} />
                  <KpiStatCard
                    title={t("analytics.stats.frequency")}
                    value={data.totals.frequency ?? 0}
                    precision={2}
                  />
                  <KpiStatCard
                    title={t("analytics.stats.cpc")}
                    value={data.totals.cpc ?? 0}
                    suffix={data.currency}
                    precision={4}
                  />
                  <KpiStatCard
                    title={t("analytics.stats.cpm")}
                    value={data.totals.cpm ?? 0}
                    suffix={data.currency}
                    precision={4}
                  />
                  <KpiStatCard
                    title={t("analytics.stats.inlineLinkClicks")}
                    value={data.totals.inlineLinkClicks ?? 0}
                  />
                  <KpiStatCard
                    title={t("analytics.stats.uniqueClicks")}
                    value={data.totals.uniqueClicks ?? 0}
                  />
                  <KpiStatCard
                    title={t("analytics.stats.postEngagement")}
                    value={data.totals.postEngagement ?? 0}
                  />
                  <KpiStatCard
                    title={t("analytics.stats.videoViews")}
                    value={data.totals.videoViews ?? 0}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {isMobile ? (
            <div className="flex flex-col gap-4">
              <span className="text-sm font-semibold">
                {t("analytics.table.campaigns")}
              </span>
              <CampaignCardList rows={data.rows} currency={data.currency} />
            </div>
          ) : (
            <div dir="ltr" className="flex w-full flex-col gap-6">
              {/*
                RTL (Hebrew) breaks fixed-width tables + horizontal scroll math for
                the wide metrics table and charts; keep this region LTR like before.
              */}
              <CampaignSpendChart rows={data.rows} currency={data.currency} />
              <CampaignMetricsCharts data={data} />
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-[15px]">{t("analytics.table.campaigns")}</CardTitle>
                </CardHeader>
                <DataTable<CampaignSummaryRow>
                  loading={loading}
                  rowKey="campaignId"
                  size="middle"
                  scroll={{ x: TABLE_SCROLL_X }}
                  dataSource={data.rows}
                  columns={columns}
                  pagination={{
                    pageSize: 50,
                    showTotal: (total) => t("analytics.table.rowCount", { count: total }),
                  }}
                  expandable={{
                    expandedRowRender,
                    rowExpandable: () => true,
                  }}
                  className="[&_td]:tabular-nums"
                />
              </Card>
            </div>
          )}
        </>
      ) : null}
      </div>
    </div>
  );
}

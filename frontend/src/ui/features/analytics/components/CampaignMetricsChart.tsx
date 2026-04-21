import { Bar, Line } from "@ant-design/plots";
import { Card, Col, Empty, Row, Segmented, theme } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CampaignAnalyticsSnapshot, CampaignSummaryRow } from "../../../../domain/CampaignAnalytics";
import { usePlotPalette } from "../chart/analyticsPlotTheme";

interface Props {
  data: CampaignAnalyticsSnapshot;
}

function short(name: string, max = 16): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function barChartHeight(rowCount: number, min = 220, perRow = 44): number {
  return Math.max(min, rowCount * perRow + 80);
}

/* ── Daily: spend (area) + traffic (multi-line) ─────────────────────────── */
export function DailyTrendChart({
  daily,
}: {
  daily: CampaignAnalyticsSnapshot["dailyBreakdown"];
}) {
  const { t } = useTranslation();
  const palette = usePlotPalette();
  const { token } = theme.useToken();
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");
  if (!daily || daily.length === 0) return null;

  const fmt = (d: string, compact = false) => {
    try {
      return new Date(d).toLocaleDateString(undefined, compact ? { weekday: "long" } : { month: "short", day: "numeric" });
    } catch {
      return d;
    }
  };

  const periodConfig = {
    week: { limit: 7, label: t("analytics.period.thisWeek"), compactLabel: true },
    month: { limit: 30, label: t("analytics.period.thisMonth"), compactLabel: false },
    year: { limit: 365, label: t("analytics.period.thisYear"), compactLabel: false },
  } as const;

  const activeConfig = periodConfig[period];
  const activeDaily = daily.slice(-Math.min(activeConfig.limit, daily.length));

  const spendData = useMemo(
    () =>
      activeDaily.map((p) => ({
        date: fmt(p.date, activeConfig.compactLabel),
        spend: +p.spend.toFixed(2),
      })),
    [activeDaily, activeConfig.compactLabel],
  );

  const totalSpend = spendData.reduce((sum, item) => sum + item.spend, 0);

  return (
    <Card
      size="small"
      styles={{
        body: { padding: 0 },
        header: {
          padding: "14px 18px 8px",
          borderBottom: "none",
          minHeight: "auto",
        },
      }}
      title={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: token.colorText }}>
              {t("analytics.chart.dailyTrend")}
            </span>
            <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
              {activeConfig.label} · {totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <Segmented
            size="middle"
            value={period}
            onChange={(value) => setPeriod(value as "week" | "month" | "year")}
            options={[
              { label: t("analytics.period.thisWeek"), value: "week" },
              { label: t("analytics.period.thisMonth"), value: "month" },
              { label: t("analytics.period.thisYear"), value: "year" },
            ]}
          />
        </div>
      }
    >
      <div style={{ padding: "0 12px 12px" }}>
        <Line
          data={spendData}
          xField="date"
          yField="spend"
          autoFit
          height={260}
          padding={[18, 24, 34, 40]}
          scale={{
            color: {
              range: [palette[0]],
            },
          }}
          style={{
            lineWidth: 2,
          }}
          point={{
            size: 3,
            shape: "hollow",
            style: {
              stroke: palette[0],
              lineWidth: 1.5,
              fill: "#ffffff",
            },
          }}
          axis={{
            x: {
              title: false,
              tick: false,
              line: true,
              labelAutoRotate: false,
              labelSpacing: 10,
            },
            y: {
              title: false,
              tick: false,
              line: false,
              gridLine: true,
              labelFormatter: (value: string) => Number(value).toLocaleString(),
            },
          }}
          tooltip={{
            title: "date",
            items: [
              {
                channel: "y",
                name: t("analytics.table.spend"),
                valueFormatter: (value: number) =>
                  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              },
            ],
          }}
          legend={false}
        />
      </div>
    </Card>
  );
}

/* ── Grouped horizontal bars (shared pattern) ───────────────────────────── */
function GroupedBarCard({
  title,
  data,
  valueSuffix = "",
  valueDecimals,
}: {
  title: string;
  data: { name: string; metric: string; value: number }[];
  valueSuffix?: string;
  valueDecimals?: number;
}) {
  const palette = usePlotPalette();
  const metrics = [...new Set(data.map((d) => d.metric))];
  const range = metrics.map((_, i) => palette[i % palette.length]);

  if (data.length === 0) {
    return (
      <Card size="small" title={title}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  const names = [...new Set(data.map((d) => d.name))];
  const h = barChartHeight(names.length);

  const valueFormatter =
    valueDecimals !== undefined
      ? (v: number) => `${v.toFixed(valueDecimals)}${valueSuffix ? ` ${valueSuffix}` : ""}`
      : (v: number) => `${Number(v).toLocaleString()}${valueSuffix ? ` ${valueSuffix}` : ""}`;

  return (
    <Card size="small" title={title}>
      <Bar
        data={data}
        xField="value"
        yField="name"
        seriesField="metric"
        colorField="metric"
        group
        autoFit
        height={h}
        insetLeft={4}
        insetRight={8}
        scale={{ color: { domain: metrics, range } }}
        style={{
          maxWidth: 14,
          radiusTopLeft: 4,
          radiusTopRight: 4,
          radiusBottomRight: 4,
          radiusBottomLeft: 4,
        }}
        axis={{ x: { title: false }, y: { title: false } }}
        legend={{ position: "top" }}
        tooltip={{
          items: [{ channel: "x", valueFormatter }],
        }}
        interaction={{ elementHighlight: { background: true } }}
      />
    </Card>
  );
}

function PerformanceChart({ rows }: { rows: CampaignSummaryRow[] }) {
  const { t } = useTranslation();
  const active = rows.filter((r) => r.impressions > 0 || r.clicks > 0 || r.conversions > 0);
  const data = active.flatMap((r) => {
    const name = short(r.campaignName);
    return [
      { name, metric: t("analytics.table.impressions"), value: r.impressions },
      { name, metric: t("analytics.table.clicks"), value: r.clicks },
      { name, metric: t("analytics.table.conversions"), value: r.conversions },
    ];
  });
  return <GroupedBarCard title={t("analytics.chart.performancePerCampaign")} data={data} />;
}

function ClicksBreakdownChart({ rows }: { rows: CampaignSummaryRow[] }) {
  const { t } = useTranslation();
  const active = rows.filter(
    (r) => r.clicks > 0 || (r.inlineLinkClicks ?? 0) > 0 || (r.uniqueClicks ?? 0) > 0,
  );
  if (active.length === 0) return null;
  const data = active.flatMap((r) => {
    const name = short(r.campaignName);
    return [
      { name, metric: t("analytics.table.clicks"), value: r.clicks },
      { name, metric: t("analytics.table.inlineLinkClicks"), value: r.inlineLinkClicks ?? 0 },
      { name, metric: t("analytics.table.uniqueClicks"), value: r.uniqueClicks ?? 0 },
      { name, metric: t("analytics.table.outboundClicks"), value: r.outboundClicks ?? 0 },
    ];
  });
  return <GroupedBarCard title={t("analytics.chart.clicksBreakdown")} data={data} />;
}

function ReachFrequencyChart({ rows }: { rows: CampaignSummaryRow[] }) {
  const { t } = useTranslation();
  const active = rows.filter((r) => (r.reach ?? 0) > 0);
  if (active.length === 0) return null;
  const data = active.flatMap((r) => {
    const name = short(r.campaignName);
    return [
      { name, metric: t("analytics.table.reach"), value: r.reach ?? 0 },
      { name, metric: t("analytics.table.frequency"), value: +(r.frequency ?? 0).toFixed(2) },
    ];
  });
  return <GroupedBarCard title={t("analytics.chart.reachFrequency")} data={data} valueDecimals={2} />;
}

function CtrChart({ rows }: { rows: CampaignSummaryRow[] }) {
  const { t } = useTranslation();
  const active = rows.filter((r) => r.ctr > 0);
  if (active.length === 0) return null;
  const data = active.flatMap((r) => {
    const name = short(r.campaignName);
    return [
      { name, metric: "CTR %", value: +r.ctr.toFixed(2) },
      { name, metric: "Unique CTR %", value: +(r.uniqueCtr ?? 0).toFixed(2) },
      { name, metric: "Inline CTR %", value: +(r.inlineLinkClickCtr ?? 0).toFixed(2) },
    ];
  });
  return <GroupedBarCard title={t("analytics.chart.ctrPerCampaign")} data={data} valueSuffix="%" valueDecimals={2} />;
}

function CostMetricsChart({ rows, currency }: { rows: CampaignSummaryRow[]; currency: string }) {
  const { t } = useTranslation();
  const active = rows.filter((r) => (r.cpc ?? 0) > 0 || (r.cpm ?? 0) > 0);
  if (active.length === 0) return null;
  const data = active.flatMap((r) => {
    const name = short(r.campaignName);
    return [
      { name, metric: t("analytics.table.cpc"), value: +(r.cpc ?? 0).toFixed(4) },
      { name, metric: t("analytics.table.cpm"), value: +(r.cpm ?? 0).toFixed(4) },
      { name, metric: "Cost/Inline", value: +(r.costPerInlineLinkClick ?? 0).toFixed(4) },
      { name, metric: "Cost/Unique", value: +(r.costPerUniqueClick ?? 0).toFixed(4) },
    ];
  });
  return (
    <GroupedBarCard
      title={`${t("analytics.chart.costMetrics")} (${currency})`}
      data={data}
      valueSuffix={currency}
      valueDecimals={4}
    />
  );
}

function EngagementChart({ rows }: { rows: CampaignSummaryRow[] }) {
  const { t } = useTranslation();
  const active = rows.filter(
    (r) => (r.postEngagement ?? 0) > 0 || (r.videoViews ?? 0) > 0 || (r.landingPageViews ?? 0) > 0,
  );
  if (active.length === 0) return null;
  const data = active.flatMap((r) => {
    const name = short(r.campaignName);
    return [
      { name, metric: t("analytics.table.postEngagement"), value: r.postEngagement ?? 0 },
      { name, metric: t("analytics.table.videoViews"), value: r.videoViews ?? 0 },
      { name, metric: t("analytics.table.landingPageViews"), value: r.landingPageViews ?? 0 },
      { name, metric: t("analytics.table.linkClicks"), value: r.linkClicks ?? 0 },
    ];
  });
  return <GroupedBarCard title={t("analytics.chart.engagementPerCampaign")} data={data} />;
}

function ActionBreakdownChart({ data }: { data: CampaignAnalyticsSnapshot }) {
  const { t } = useTranslation();
  const palette = usePlotPalette();

  const allActions: Record<string, number> = {};
  for (const row of data.rows) {
    for (const a of row.actionBreakdown ?? []) {
      allActions[a.actionType] = (allActions[a.actionType] ?? 0) + a.value;
    }
  }
  for (const a of data.totals.actionBreakdown ?? []) {
    if (!(a.actionType in allActions)) {
      allActions[a.actionType] = a.value;
    }
  }

  const sorted = Object.entries(allActions)
    .map(([name, value]) => ({ name, value }))
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value);

  if (sorted.length === 0) return null;

  const TOP = 15;
  const top = sorted.slice(0, TOP);
  const otherSum = sorted.slice(TOP).reduce((s, a) => s + a.value, 0);
  const chartData = [...top];
  if (otherSum > 0) chartData.push({ name: "Other", value: otherSum });

  const h = barChartHeight(chartData.length, 200, 32);

  return (
    <Card size="small" title={t("analytics.chart.actionBreakdown")}>
      <Bar
        data={chartData}
        xField="value"
        yField="name"
        autoFit
        height={h}
        insetLeft={4}
        insetRight={8}
        colorField="name"
        scale={{
          color: { range: chartData.map((_, i) => palette[i % palette.length]) },
        }}
        style={{
          maxWidth: 20,
          radiusTopLeft: 4,
          radiusTopRight: 4,
          radiusBottomRight: 4,
          radiusBottomLeft: 4,
        }}
        axis={{ x: { title: false }, y: { title: false } }}
        legend={false}
        tooltip={{
          items: [{ channel: "x", valueFormatter: (v: number) => v.toLocaleString() }],
        }}
        interaction={{ elementHighlight: { background: true } }}
      />
    </Card>
  );
}

export function CampaignMetricsCharts({ data }: Props) {
  return (
    <Row gutter={[16, 16]}>
      {data.dailyBreakdown && data.dailyBreakdown.length > 0 && (
        <Col xs={24}>
          <DailyTrendChart daily={data.dailyBreakdown} />
        </Col>
      )}
      <Col xs={24}>
        <PerformanceChart rows={data.rows} />
      </Col>
      <Col xs={24} lg={12}>
        <ClicksBreakdownChart rows={data.rows} />
      </Col>
      <Col xs={24} lg={12}>
        <ReachFrequencyChart rows={data.rows} />
      </Col>
      <Col xs={24} lg={12}>
        <CtrChart rows={data.rows} />
      </Col>
      <Col xs={24} lg={12}>
        <CostMetricsChart rows={data.rows} currency={data.currency} />
      </Col>
      <Col xs={24} lg={12}>
        <EngagementChart rows={data.rows} />
      </Col>
      <Col xs={24} lg={12}>
        <ActionBreakdownChart data={data} />
      </Col>
    </Row>
  );
}

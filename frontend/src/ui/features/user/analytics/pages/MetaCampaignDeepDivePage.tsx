import type { ReactNode } from "react";
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  ConfigProvider,
  DatePicker,
  Divider,
  Drawer,
  Dropdown,
  Flex,
  Grid,
  Row,
  Skeleton,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import type { CampaignAdsData, CampaignAnalyticsSnapshot, CampaignSummaryRow } from "@/domain/CampaignAnalytics";
import { useApp } from "@/app/AppProviders";
import { accountPath } from "@/ui/navigation/paths";
import { UserContentLayout } from "@/ui/shared/components/UserContentLayout";
import { CampaignCreativeGallery } from "../components/CampaignCreativeGallery";
import { KpiStatCard } from "../components/KpiStatCard";
import {
  classifyCampaignObjective,
  getCostPerPrimaryGoal,
  getPrimaryGoalDisplay,
  type CampaignGoalKind,
} from "../utils/campaignObjective";
import { exportCampaignDetailCsv, exportCampaignDetailPdf } from "../utils/exportUtils";

const { RangePicker } = DatePicker;

type DateRange = [Dayjs | null, Dayjs | null] | null;

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
  const { message } = App.useApp();
  const { services } = useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
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

  const messageRef = useRef(message);
  messageRef.current = message;

  const since = dateRange?.[0]?.format("YYYY-MM-DD");
  const until = dateRange?.[1]?.format("YYYY-MM-DD");

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
      messageRef.current.error(e instanceof Error ? e.message : t("analytics.loadError"));
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
  const metricsColumns: ColumnsType<CampaignSummaryRow> = useMemo(() => {
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

    const cols: ColumnsType<CampaignSummaryRow> = [
      {
        title: t("analytics.table.campaign"),
        dataIndex: "campaignName",
        key: "name",
        fixed: "left",
        width: 220,
        ellipsis: true,
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
        render: (_: unknown, row: CampaignSummaryRow) => def.render(row),
      });
    }

    return cols;
  }, [t, currency, activeColumns, zeroColumns]);

  if (loading && !snapshot) {
    return (
      <UserContentLayout>
        <Skeleton active paragraph={{ rows: 6 }} />
      </UserContentLayout>
    );
  }

  return (
    <UserContentLayout>
      <Flex vertical gap={24} style={{ width: "100%" }}>
        {/* Page header: back link + campaign title + status tags */}
        <div>
          <div style={{ marginBottom: 8 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              type="text"
              size="small"
              style={{ marginInlineStart: -8, color: "var(--ds-text-secondary)" }}
              onClick={() => navigate(accountPath(accountId ?? "", "meta"))}
            >
              {t("meta.deepdive.backToCampaigns")}
            </Button>
          </div>
          <Flex align="center" gap={12} wrap="wrap">
            <div style={{ minWidth: 0, flex: 1 }}>
              <Typography.Title
                level={2}
                style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 600 }}
                ellipsis
              >
                {campaign?.campaignName ?? campaignId}
              </Typography.Title>
            </div>
            <Flex gap={4} wrap="wrap">
              {campaign?.objective && (
                <Tag>{campaign.objective.replace(/_/g, " ")}</Tag>
              )}
              {campaign?.status && (
                <Tag color={campaign.status === "ACTIVE" ? "success" : "warning"}>
                  {campaign.status}
                </Tag>
              )}
            </Flex>
          </Flex>
        </div>

        {/* Top KPI cards */}
        {campaign && mainGoal && (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <KpiStatCard
                title={t("analytics.stats.spend")}
                value={campaign.spend}
                suffix={currency}
                precision={2}
              />
            </Col>
            {mainGoal.value !== "0" && (
              <Col xs={24} sm={12} lg={6}>
                <KpiStatCard title={mainGoal.label} value={mainGoal.value} />
              </Col>
            )}
            <Col xs={24} sm={12} lg={6}>
              <KpiStatCard title={t("analytics.stats.impressions")} value={campaign.impressions} />
            </Col>
            {costPerResult && (
              <Col xs={24} sm={12} lg={6}>
                <KpiStatCard
                  title={costPerResult.label}
                  value={costPerResult.value}
                  suffix={currency}
                />
              </Col>
            )}
          </Row>
        )}

        {/* ── Creatives section (prominent, right after KPIs) ── */}
        <Divider style={{ margin: 0 }} />
        <Flex vertical gap={16}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            {t("meta.deepdive.creativesTitle")}
          </Typography.Title>
          <CampaignCreativeGallery
            ads={adsData?.ads ?? []}
            currency={adsData?.currency ?? currency}
            loading={adsLoading}
            objective={adsData?.objective ?? campaign?.objective ?? ""}
          />
        </Flex>

        {/* ── Detailed metrics: one card = toolbar + table ── */}
        <Divider style={{ margin: 0 }} />
        <Card title={t("meta.deepdive.metricsTitle")} styles={{ body: { padding: 16 } }}>
          <Flex vertical gap={16}>
            <Flex gap={8} wrap="wrap" align="center" justify="space-between">
              <ConfigProvider direction="ltr">
                <RangePicker
                  value={dateRange ? [dateRange[0], dateRange[1]] : null}
                  onChange={(val) => setDateRange(val as DateRange)}
                  presets={[
                    { label: t("analytics.period.last7Days"), value: [dayjs().subtract(6, "day"), dayjs()] },
                    { label: t("analytics.period.last30Days"), value: [dayjs().subtract(29, "day"), dayjs()] },
                    { label: t("analytics.period.last90Days"), value: [dayjs().subtract(89, "day"), dayjs()] },
                  ]}
                  format="YYYY-MM-DD"
                  style={{ width: isMobile ? "100%" : 260 }}
                />
              </ConfigProvider>
              <Flex gap={8}>
                <Button icon={<SettingOutlined />} onClick={() => setManageOpen(true)}>
                  {!isMobile && t("meta.deepdive.manageColumns")}
                </Button>
                <Dropdown
                  disabled={!campaign}
                  menu={{
                    items: [
                      {
                        key: "csv",
                        icon: <FileTextOutlined />,
                        label: t("meta.panel.exportCsv"),
                        onClick: () =>
                          campaign &&
                          exportCampaignDetailCsv(campaign, currency, adsData?.ads ?? []),
                      },
                      {
                        key: "pdf",
                        icon: <FilePdfOutlined />,
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
                    ],
                  }}
                >
                  <Button icon={<DownloadOutlined />} disabled={!campaign}>
                    {!isMobile && t("meta.panel.export")}{" "}
                  </Button>
                </Dropdown>
                <Button
                  icon={<ReloadOutlined />}
                  loading={loading}
                  onClick={() => { void loadSnapshot(); void loadAds(); }}
                >
                  {!isMobile && t("common.reload")}
                </Button>
              </Flex>
            </Flex>

            <ConfigProvider direction="ltr">
              <Table<CampaignSummaryRow>
                loading={loading}
                rowKey="campaignId"
                size="middle"
                dataSource={tableData}
                columns={metricsColumns}
                pagination={false}
                scroll={{ x: "max-content" }}
                locale={{ emptyText: t("common.noData") }}
              />
            </ConfigProvider>
          </Flex>
        </Card>
      </Flex>

      {/* Manage Columns Drawer */}
      <Drawer
        title={t("meta.deepdive.manageColumns")}
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        width={320}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {t("meta.deepdive.manageColumnsHint")}
        </Typography.Paragraph>
        <Flex vertical gap={12}>
          {ALL_COLUMNS.map((col) => (
            <Checkbox
              key={col}
              checked={activeColumns.includes(col)}
              onChange={(e) => {
                if (e.target.checked) {
                  setActiveColumns((prev) => [...prev, col]);
                } else {
                  setActiveColumns((prev) => prev.filter((c) => c !== col));
                }
              }}
            >
              {col.replace(/([A-Z])/g, " $1").trim()}
            </Checkbox>
          ))}
        </Flex>
        <Flex gap={8} style={{ marginTop: 24 }}>
          <Button onClick={() => setActiveColumns([...ALL_COLUMNS])}>{t("meta.deepdive.selectAll")}</Button>
          <Button
            onClick={() =>
              campaign &&
              setActiveColumns(defaultColumnsForKind(classifyCampaignObjective(campaign.objective)))
            }
          >
            {t("meta.deepdive.resetColumns")}
          </Button>
        </Flex>
      </Drawer>
    </UserContentLayout>
  );
}

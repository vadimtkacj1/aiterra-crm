import { ReloadOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Collapse,
  ConfigProvider,
  Empty,
  Flex,
  Grid,
  Row,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  theme,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CampaignAnalyticsSnapshot, CampaignSummaryRow } from "../../../../domain/CampaignAnalytics";
import { CampaignCardList } from "./CampaignCardList";
import { CampaignSpendChart } from "./CampaignSpendChart";
import { CampaignMetricsCharts } from "./CampaignMetricsChart";

/** Min width per column; sum + expand column must be ≤ scroll.x (Ant Design fixed columns). */
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
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CampaignAnalyticsSnapshot | null>(null);
  const messageRef = useRef(message);
  const tRef = useRef(t);
  messageRef.current = message;
  tRef.current = t;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await load();
      setData(snap);
    } catch (e) {
      messageRef.current.error(e instanceof Error ? e.message : tRef.current("analytics.loadError"));
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const periodText =
    data?.periodI18nKey != null && data.periodI18nKey.length > 0 ? t(data.periodI18nKey) : data?.periodLabel;

  const currency = data?.currency ?? "";

  const columns: ColumnsType<CampaignSummaryRow> = useMemo(() => {
    const money = (v: number | undefined) => `${(v ?? 0).toFixed(4)} ${currency}`;
    const pct = (v: number | undefined) => (v ?? 0).toFixed(2);
    const int = (v: number | undefined) => (v ?? 0).toLocaleString();
    const [w0, w1, w2, w3, w4, w5, w6, w7, w8, w9, w10, w11, w12, w13, w14, w15, w16, w17, w18, w19, w20] =
      DESKTOP_COL_WIDTHS;

    const sized = (width: number) => ({ width, minWidth: width });

    return [
      {
        title: t("analytics.table.campaign"),
        dataIndex: "campaignName",
        key: "name",
        fixed: "left" as const,
        ...sized(w0),
        ellipsis: { showTitle: true },
      },
      {
        title: t("analytics.table.impressions"),
        dataIndex: "impressions",
        key: "impr",
        ...sized(w1),
        render: int,
      },
      { title: t("analytics.table.clicks"), dataIndex: "clicks", key: "clk", ...sized(w2), render: int },
      {
        title: t("analytics.table.ctr"),
        dataIndex: "ctr",
        key: "ctr",
        ...sized(w3),
        render: (v: number) => `${pct(v)}%`,
      },
      {
        title: t("analytics.table.spend"),
        dataIndex: "spend",
        key: "spend",
        ...sized(w4),
        render: (v: number) => `${v.toFixed(2)} ${currency}`,
      },
      { title: t("analytics.table.conversions"), dataIndex: "conversions", key: "conv", ...sized(w5), render: int },
      { title: t("analytics.table.reach"), dataIndex: "reach", key: "reach", ...sized(w6), render: int },
      {
        title: t("analytics.table.frequency"),
        dataIndex: "frequency",
        key: "freq",
        ...sized(w7),
        render: (v: number | undefined) => pct(v),
      },
      {
        title: t("analytics.table.cpc"),
        dataIndex: "cpc",
        key: "cpc",
        ...sized(w8),
        render: (v: number | undefined) => money(v),
      },
      {
        title: t("analytics.table.cpm"),
        dataIndex: "cpm",
        key: "cpm",
        ...sized(w9),
        render: (v: number | undefined) => money(v),
      },
      {
        title: t("analytics.table.inlineLinkClicks"),
        dataIndex: "inlineLinkClicks",
        key: "ilc",
        ...sized(w10),
        render: int,
      },
      {
        title: t("analytics.table.inlineLinkClickCtr"),
        dataIndex: "inlineLinkClickCtr",
        key: "ilctr",
        ...sized(w11),
        render: (v: number | undefined) => `${pct(v)}%`,
      },
      {
        title: t("analytics.table.costPerInlineLinkClick"),
        dataIndex: "costPerInlineLinkClick",
        key: "cpilc",
        ...sized(w12),
        render: money,
      },
      {
        title: t("analytics.table.uniqueClicks"),
        dataIndex: "uniqueClicks",
        key: "uq",
        ...sized(w13),
        render: int,
      },
      {
        title: t("analytics.table.uniqueCtr"),
        dataIndex: "uniqueCtr",
        key: "uqctr",
        ...sized(w14),
        render: (v: number | undefined) => `${pct(v)}%`,
      },
      {
        title: t("analytics.table.costPerUniqueClick"),
        dataIndex: "costPerUniqueClick",
        key: "cpuq",
        ...sized(w15),
        render: money,
      },
      {
        title: t("analytics.table.outboundClicks"),
        dataIndex: "outboundClicks",
        key: "obc",
        ...sized(w16),
        render: int,
      },
      {
        title: t("analytics.table.linkClicks"),
        dataIndex: "linkClicks",
        key: "lk",
        ...sized(w17),
        render: int,
      },
      {
        title: t("analytics.table.landingPageViews"),
        dataIndex: "landingPageViews",
        key: "lpv",
        ...sized(w18),
        render: int,
      },
      {
        title: t("analytics.table.postEngagement"),
        dataIndex: "postEngagement",
        key: "pe",
        ...sized(w19),
        render: int,
      },
      {
        title: t("analytics.table.videoViews"),
        dataIndex: "videoViews",
        key: "vv",
        ...sized(w20),
        render: int,
      },
    ];
  }, [t, currency]);

  const expandedRowRender = useCallback(
    (row: CampaignSummaryRow) => {
      const actions = row.actionBreakdown ?? [];
      if (actions.length === 0) {
        return (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {t("analytics.table.noActionsDetail")}
          </Typography.Text>
        );
      }
      return (
        <div>
          <Typography.Text strong style={{ display: "block", marginBottom: 8, fontSize: 13 }}>
            {t("analytics.table.actionsDetail")}
          </Typography.Text>
          <Space wrap size={[8, 8]}>
            {actions.map((a) => (
              <Tag key={`${row.campaignId}-${a.actionType}`}>
                {a.actionType}: {a.value.toLocaleString()}
              </Tag>
            ))}
          </Space>
        </div>
      );
    },
    [t],
  );

  return (
    <Flex vertical gap="middle" style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <Typography.Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          <Typography.Paragraph
            type="secondary"
            style={{ marginBottom: 0, fontSize: isMobile ? 12 : 14 }}
          >
            {description}
          </Typography.Paragraph>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void refresh()}
          loading={loading}
          size={isMobile ? "small" : "middle"}
        >
          {t("common.reload")}
        </Button>
      </div>

      {loading && !data ? (
        <Flex vertical gap="large" style={{ width: "100%" }}>
          <Skeleton active title={false} paragraph={{ rows: 1 }} />
          <Row gutter={[12, 12]}>
            {[0, 1, 2, 3].map((k) => (
              <Col key={k} xs={12} lg={6}>
                <Card size="small">
                  <Skeleton active title paragraph={{ rows: 1 }} />
                </Card>
              </Col>
            ))}
          </Row>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Flex>
      ) : null}

      {data && isSnapshotEmpty(data) ? (
        <Card size="small" styles={{ body: { padding: isMobile ? 24 : 40 } }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Flex vertical gap="small" align="center">
                <Typography.Text strong>{t("analytics.empty.title")}</Typography.Text>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 420 }}>
                  {t("analytics.empty.description")}
                </Typography.Paragraph>
              </Flex>
            }
          >
            <Button type="primary" icon={<ReloadOutlined />} loading={loading} onClick={() => void refresh()}>
              {t("common.reload")}
            </Button>
          </Empty>
        </Card>
      ) : null}

      {data && !isSnapshotEmpty(data) ? (
        <>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {periodText}
            {data.rows.length > 0 ? (
              <>
                {" · "}
                {t("analytics.table.rowCount", { count: data.rows.length })}
              </>
            ) : null}
          </Typography.Text>

          <Row gutter={[12, 12]}>
            <Col xs={12} sm={12} lg={6}>
              <Card size="small" styles={{ body: { padding: isMobile ? 12 : 20 } }}>
                <Statistic
                  title={t("analytics.stats.impressions")}
                  value={data.totals.impressions}
                  valueStyle={isMobile ? { fontSize: 20 } : undefined}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card size="small" styles={{ body: { padding: isMobile ? 12 : 20 } }}>
                <Statistic
                  title={t("analytics.stats.clicks")}
                  value={data.totals.clicks}
                  valueStyle={isMobile ? { fontSize: 20 } : undefined}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card size="small" styles={{ body: { padding: isMobile ? 12 : 20 } }}>
                <Statistic
                  title={t("analytics.stats.spend")}
                  value={data.totals.spend}
                  suffix={data.currency}
                  precision={2}
                  valueStyle={isMobile ? { fontSize: 20 } : undefined}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card size="small" styles={{ body: { padding: isMobile ? 12 : 20 } }}>
                <Statistic
                  title={t("analytics.stats.conversions")}
                  value={data.totals.conversions}
                  valueStyle={isMobile ? { fontSize: 20 } : undefined}
                />
              </Card>
            </Col>
          </Row>

          <Collapse
            bordered={false}
            style={{ background: token.colorFillAlter, borderRadius: token.borderRadiusLG }}
            expandIconPosition="end"
            defaultActiveKey={isMobile ? [] : ["more"]}
            items={[
              {
                key: "more",
                label: <Typography.Text strong>{t("analytics.table.moreMetrics")}</Typography.Text>,
                children: (
                  <Row gutter={[12, 12]}>
                    <Col xs={12} sm={12} lg={6}>
                      <Card size="small" styles={{ body: { padding: isMobile ? 12 : 20 } }}>
                        <Statistic
                          title={t("analytics.stats.reach")}
                          value={data.totals.reach ?? 0}
                          valueStyle={isMobile ? { fontSize: 20 } : undefined}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={12} lg={6}>
                      <Card size="small" styles={{ body: { padding: isMobile ? 12 : 20 } }}>
                        <Statistic
                          title={t("analytics.stats.frequency")}
                          value={data.totals.frequency ?? 0}
                          precision={2}
                          valueStyle={isMobile ? { fontSize: 20 } : undefined}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={12} lg={6}>
                      <Card size="small" styles={{ body: { padding: isMobile ? 12 : 20 } }}>
                        <Statistic
                          title={t("analytics.stats.cpc")}
                          value={data.totals.cpc ?? 0}
                          suffix={data.currency}
                          precision={4}
                          valueStyle={isMobile ? { fontSize: 20 } : undefined}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={12} lg={6}>
                      <Card size="small" styles={{ body: { padding: isMobile ? 12 : 20 } }}>
                        <Statistic
                          title={t("analytics.stats.cpm")}
                          value={data.totals.cpm ?? 0}
                          suffix={data.currency}
                          precision={4}
                          valueStyle={isMobile ? { fontSize: 20 } : undefined}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={12} lg={6}>
                      <Card size="small" styles={{ body: { padding: isMobile ? 12 : 20 } }}>
                        <Statistic
                          title={t("analytics.stats.inlineLinkClicks")}
                          value={data.totals.inlineLinkClicks ?? 0}
                          valueStyle={isMobile ? { fontSize: 20 } : undefined}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={12} lg={6}>
                      <Card size="small" styles={{ body: { padding: isMobile ? 12 : 20 } }}>
                        <Statistic
                          title={t("analytics.stats.uniqueClicks")}
                          value={data.totals.uniqueClicks ?? 0}
                          valueStyle={isMobile ? { fontSize: 20 } : undefined}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={12} lg={6}>
                      <Card size="small" styles={{ body: { padding: isMobile ? 12 : 20 } }}>
                        <Statistic
                          title={t("analytics.stats.postEngagement")}
                          value={data.totals.postEngagement ?? 0}
                          valueStyle={isMobile ? { fontSize: 20 } : undefined}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={12} lg={6}>
                      <Card size="small" styles={{ body: { padding: isMobile ? 12 : 20 } }}>
                        <Statistic
                          title={t("analytics.stats.videoViews")}
                          value={data.totals.videoViews ?? 0}
                          valueStyle={isMobile ? { fontSize: 20 } : undefined}
                        />
                      </Card>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />

          {isMobile ? (
            <>
              <Typography.Text strong style={{ fontSize: 14 }}>
                {t("analytics.table.campaigns")}
              </Typography.Text>
              <CampaignCardList rows={data.rows} currency={data.currency} />
            </>
          ) : (
            <ConfigProvider direction="ltr">
              <Flex vertical gap="middle" style={{ width: "100%" }}>
                <CampaignSpendChart rows={data.rows} currency={data.currency} />
                <CampaignMetricsCharts data={data} />
                <Card
                  title={t("analytics.table.campaigns")}
                  size="small"
                  styles={{ body: { padding: 0 } }}
                >
                  {/*
                    RTL (Hebrew) breaks Ant Design Table fixed columns + horizontal scroll.
                    ConfigProvider direction=ltr keeps column order and scroll math stable.
                  */}
                  <Table<CampaignSummaryRow>
                    loading={loading}
                    rowKey="campaignId"
                    pagination={{
                      pageSize: 50,
                      showSizeChanger: true,
                      pageSizeOptions: [25, 50, 100, 200],
                      showTotal: (total) => t("analytics.table.rowCount", { count: total }),
                    }}
                    size="small"
                    scroll={{ x: TABLE_SCROLL_X }}
                    dataSource={data.rows}
                    columns={columns}
                    expandable={{
                      expandedRowRender,
                      rowExpandable: () => true,
                    }}
                  />
                </Card>
              </Flex>
            </ConfigProvider>
          )}
        </>
      ) : null}
    </Flex>
  );
}

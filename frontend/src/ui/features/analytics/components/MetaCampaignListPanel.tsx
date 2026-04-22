import {
  DownloadOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  ConfigProvider,
  DatePicker,
  Dropdown,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import type { TFunction } from "i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { CampaignAnalyticsSnapshot, CampaignSummaryRow } from "../../../../domain/CampaignAnalytics";
import { accountCampaignPath, Paths } from "../../../navigation/paths";
import {
  classifyCampaignObjective,
  getPrimaryGoalDisplay,
  goalKindI18nKey,
  primaryGoalSortValue,
  type CampaignGoalKind,
} from "../utils/campaignObjective";
import { exportCampaignListCsv, exportCampaignListPdf } from "../utils/exportUtils";
import { KpiStatCard } from "./KpiStatCard";

const { RangePicker } = DatePicker;
type DateRange = [Dayjs | null, Dayjs | null] | null;
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

function statusColor(status: string): string {
  switch ((status ?? "").toUpperCase()) {
    case "ACTIVE": return "success";
    case "PAUSED": return "warning";
    case "DELETED":
    case "ARCHIVED": return "default";
    default: return "processing";
  }
}

function goalKindColor(kind: CampaignGoalKind): string {
  switch (kind) {
    case "leads":
      return "blue";
    case "sales":
      return "green";
    case "engagement":
      return "purple";
    case "traffic":
      return "cyan";
    default:
      return "default";
  }
}


interface MetaCampaignListPanelProps {
  load: (since?: string, until?: string) => Promise<CampaignAnalyticsSnapshot>;
}

export function MetaCampaignListPanel({ load }: MetaCampaignListPanelProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CampaignAnalyticsSnapshot | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [dateRange, setDateRange] = useState<DateRange>(null);

  const messageRef = useRef(message);
  messageRef.current = message;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await load(
        dateRange?.[0]?.format("YYYY-MM-DD"),
        dateRange?.[1]?.format("YYYY-MM-DD"),
      );
      setData(snap);
    } catch (e) {
      messageRef.current.error(e instanceof Error ? e.message : t("analytics.loadError"));
    } finally {
      setLoading(false);
    }
  }, [load, t, dateRange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    return rows;
  }, [data, search, statusFilter]);

  const currency = data?.currency ?? "";
  const goalMetric = data ? getTotalGoalLabel(data, t) : null;

  const columns: ColumnsType<CampaignSummaryRow> = useMemo(() => {
    const actionCol: ColumnsType<CampaignSummaryRow>[number] = {
      title: "",
      key: "action",
      width: 40,
      render: (_: unknown, row: CampaignSummaryRow) => (
        <Button
          type="text"
          size="small"
          icon={<RightOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            if (accountId) navigate(accountCampaignPath(accountId, row.campaignId));
          }}
        />
      ),
    };

    if (isMobile) {
      return [
        {
          title: t("analytics.table.campaign"),
          dataIndex: "campaignName",
          key: "name",
          sorter: (a, b) => a.campaignName.localeCompare(b.campaignName),
          ellipsis: true,
          render: (name: string, row: CampaignSummaryRow) => (
            <Flex vertical gap={2}>
              <Typography.Text strong style={{ fontSize: 13 }}>{name}</Typography.Text>
              <Flex gap={4} wrap="wrap">
                <Tag color={statusColor(row.status ?? "ACTIVE")} style={{ fontSize: 10, padding: "0 4px", lineHeight: "16px", margin: 0 }}>
                  {(row.status ?? "ACTIVE").toUpperCase()}
                </Tag>
                {row.objective && (
                  <Tag color={goalKindColor(classifyCampaignObjective(row.objective))} style={{ fontSize: 10, padding: "0 4px", lineHeight: "16px", margin: 0 }}>
                    {t(goalKindI18nKey(classifyCampaignObjective(row.objective)))}
                  </Tag>
                )}
              </Flex>
            </Flex>
          ),
        },
        {
          title: t("analytics.table.spend"),
          dataIndex: "spend",
          key: "spend",
          width: 90,
          sorter: (a, b) => a.spend - b.spend,
          defaultSortOrder: "descend",
          render: (v: number) => (
            <Typography.Text strong style={{ fontSize: 12 }}>{v.toFixed(0)} {currency}</Typography.Text>
          ),
        },
        {
          title: t("meta.panel.result"),
          key: "result",
          width: 80,
          render: (_: unknown, row: CampaignSummaryRow) => {
            const m = getPrimaryGoalDisplay(row, t);
            return (
              <Flex vertical gap={0}>
                <Typography.Text strong style={{ fontSize: 13 }}>{m.value}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 10 }}>{m.label}</Typography.Text>
              </Flex>
            );
          },
          sorter: (a, b) => primaryGoalSortValue(a) - primaryGoalSortValue(b),
        },
        actionCol,
      ];
    }

    return [
      {
        title: t("analytics.table.campaign"),
        dataIndex: "campaignName",
        key: "name",
        sorter: (a, b) => a.campaignName.localeCompare(b.campaignName),
        ellipsis: true,
        render: (name: string, row: CampaignSummaryRow) => (
          <Flex vertical gap={2}>
            <Typography.Text strong>{name}</Typography.Text>
            {row.objective && (
              <Tag
                color={goalKindColor(classifyCampaignObjective(row.objective))}
                style={{ fontSize: 10, padding: "0 4px", lineHeight: "16px", width: "fit-content" }}
              >
                {row.objective.replace(/_/g, " ")}
              </Tag>
            )}
          </Flex>
        ),
      },
      {
        title: t("meta.panel.goalType"),
        key: "goalKind",
        width: 120,
        render: (_: unknown, row: CampaignSummaryRow) => {
          const kind = classifyCampaignObjective(row.objective);
          return (
            <Tag color={goalKindColor(kind)} style={{ margin: 0 }}>
              {t(goalKindI18nKey(kind))}
            </Tag>
          );
        },
        sorter: (a, b) => {
          const ka = goalKindI18nKey(classifyCampaignObjective(a.objective));
          const kb = goalKindI18nKey(classifyCampaignObjective(b.objective));
          return ka.localeCompare(kb);
        },
      },
      {
        title: t("meta.panel.status"),
        dataIndex: "status",
        key: "status",
        width: 100,
        render: (s: string) => (
          <Tag color={statusColor(s)}>{(s ?? "—").toUpperCase()}</Tag>
        ),
        sorter: (a, b) => (a.status ?? "").localeCompare(b.status ?? ""),
      },
      {
        title: t("analytics.table.spend"),
        dataIndex: "spend",
        key: "spend",
        width: 120,
        sorter: (a, b) => a.spend - b.spend,
        defaultSortOrder: "descend",
        render: (v: number) => (
          <Typography.Text strong>{v.toFixed(2)} {currency}</Typography.Text>
        ),
      },
      {
        title: t("meta.panel.result"),
        key: "result",
        width: 200,
        render: (_: unknown, row: CampaignSummaryRow) => {
          const m = getPrimaryGoalDisplay(row, t);
          return (
            <Flex vertical gap={0}>
              <Typography.Text strong>{m.value}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>{m.label}</Typography.Text>
            </Flex>
          );
        },
        sorter: (a, b) => primaryGoalSortValue(a) - primaryGoalSortValue(b),
      },
      {
        title: t("analytics.table.impressions"),
        dataIndex: "impressions",
        key: "impr",
        width: 120,
        sorter: (a, b) => a.impressions - b.impressions,
        render: (v: number) => v.toLocaleString(),
      },
      {
        title: t("analytics.table.ctr"),
        dataIndex: "ctr",
        key: "ctr",
        width: 90,
        sorter: (a, b) => a.ctr - b.ctr,
        render: (v: number) => `${v.toFixed(2)}%`,
      },
      actionCol,
    ];
  }, [t, currency, accountId, navigate, isMobile]);

  const updatedAtText = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null;

  if (loading && !data) {
    return (
      <Flex vertical gap="large" style={{ width: "100%" }}>
        <Row gutter={[12, 12]}>
          {[0, 1, 2].map((k) => (
            <Col key={k} xs={12} lg={8}>
              <Card size="small">
                <Skeleton active title paragraph={{ rows: 1 }} />
              </Card>
            </Col>
          ))}
        </Row>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Flex>
    );
  }

  if (data && data.rows.length === 0 && !search && statusFilter === "ALL") {
    return (
      <Card size="small">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("analytics.empty.title")}>
          <Typography.Paragraph type="secondary" style={{ maxWidth: 420, margin: "0 auto 12px", textAlign: "center" }}>
            {t("analytics.empty.description")}
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary" style={{ maxWidth: 420, margin: "0 auto 16px", textAlign: "center", fontSize: 13 }}>
            {t("analytics.empty.nextSteps")}
          </Typography.Paragraph>
          <Flex justify="center" gap={8} wrap="wrap">
            <Button icon={<ReloadOutlined />} onClick={() => void refresh()} loading={loading}>
              {t("common.reload")}
            </Button>
            <Link to={Paths.help}>
              <Button type="default">{t("analytics.empty.openHelp")}</Button>
            </Link>
          </Flex>
        </Empty>
      </Card>
    );
  }

  return (
    <Flex vertical gap="middle" style={{ width: "100%" }}>
      {/* Top KPI bar */}
      {data && goalMetric && (
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={8} lg={6}>
            <KpiStatCard
              compact={isMobile}
              title={t("analytics.stats.spend")}
              value={data.totals.spend}
              suffix={currency}
              precision={2}
              valueStyle={isMobile ? { fontSize: 20 } : undefined}
            />
          </Col>
          {goalMetric.value !== "0" && (
            <Col xs={12} sm={8} lg={6}>
              <KpiStatCard
                compact={isMobile}
                title={goalMetric.label}
                value={goalMetric.value}
                valueStyle={isMobile ? { fontSize: 20 } : undefined}
              />
            </Col>
          )}
          <Col xs={12} sm={8} lg={6}>
            <KpiStatCard
              compact={isMobile}
              title={t("analytics.stats.impressions")}
              value={data.totals.impressions}
              valueStyle={isMobile ? { fontSize: 20 } : undefined}
            />
          </Col>
        </Row>
      )}

      {/* Toolbar */}
      <Flex gap={8} wrap="wrap" align="center" justify="space-between">
        <Flex gap={8} wrap="wrap" flex={1} style={{ minWidth: 0 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder={t("meta.panel.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: isMobile ? "100%" : 220 }}
          />
          <Select<StatusFilter>
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 130 }}
            options={[
              { value: "ALL", label: t("meta.panel.filterAll") },
              { value: "ACTIVE", label: t("meta.panel.filterActive") },
              { value: "PAUSED", label: t("meta.panel.filterPaused") },
            ]}
          />
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
              style={{ width: isMobile ? "100%" : 240 }}
            />
          </ConfigProvider>
        </Flex>
        <Flex gap={8} align="center">
          {updatedAtText && (
            <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
              <SyncOutlined style={{ marginInlineEnd: 4 }} />
              {t("meta.panel.updatedAt", { time: updatedAtText })}
            </Typography.Text>
          )}
          <Dropdown
            disabled={!data || filteredRows.length === 0}
            menu={{
              items: [
                {
                  key: "csv",
                  icon: <FileTextOutlined />,
                  label: "Export CSV",
                  onClick: () => data && exportCampaignListCsv(filteredRows, currency),
                },
                {
                  key: "pdf",
                  icon: <FilePdfOutlined />,
                  label: "Export PDF",
                  onClick: () => data && exportCampaignListPdf(filteredRows, currency, data.periodLabel),
                },
              ],
            }}
          >
            <Button
              icon={<DownloadOutlined />}
              size="small"
              disabled={!data || filteredRows.length === 0}
            >
              {!isMobile && "Export"}{" "}
            </Button>
          </Dropdown>
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={() => void refresh()}
            loading={loading}
          >
            {!isMobile && t("common.reload")}
          </Button>
        </Flex>
      </Flex>

      {/* Campaign table */}
      <ConfigProvider direction="ltr">
        <Card size="small" styles={{ body: { padding: 0 } }}>
          <Table<CampaignSummaryRow>
            loading={loading}
            rowKey="campaignId"
            size="small"
            dataSource={filteredRows}
            columns={columns}
            pagination={{ pageSize: 25, showSizeChanger: true, pageSizeOptions: [10, 25, 50, 100] }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    statusFilter !== "ALL"
                      ? `No ${statusFilter.toLowerCase()} campaigns`
                      : t("analytics.empty.title")
                  }
                />
              ),
            }}
            onRow={(row) => ({
              onClick: () => {
                if (accountId) navigate(accountCampaignPath(accountId, row.campaignId));
              },
              style: { cursor: "pointer" },
            })}
          />
        </Card>
      </ConfigProvider>
    </Flex>
  );
}

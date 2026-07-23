import {
  AppstoreOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Line, Pie } from "@ant-design/plots";
import { App, Button, Card, Col, Dropdown, Row, Segmented, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/app/AppProviders";
import type { AdminPaymentStats, AdminStats } from "@/services/admin/AdminService";
import { usePlotPalette } from "@/ui/features/user/analytics/chart/analyticsPlotTheme";
import {
  buildCurrencyPieData,
  buildRevenueLineChartData,
  formatRevenueSummary,
  getAdminStatsPeriodRange,
  type AdminStatsPeriod,
} from "./adminStatsData";
import { Paths } from "@/ui/navigation/paths";
import { downloadBlob } from "@/ui/shared/utils/downloadBlob";
import { PageContainer } from "@/ui/shared/components/PageContainer";
import { PageHeader } from "@/ui/shared/components/PageHeader";
import { StatCard, type StatAccent } from "@/ui/shared/components/StatCard";

type Period = AdminStatsPeriod;

/** @ant-design/plots Line tooltip datum (seriesField + yField). */
type LineSeriesTooltipDatum = { series?: string; value?: number };

/** @ant-design/plots Pie tooltip datum (colorField + angleField). */
type PieSliceTooltipDatum = { type?: string; value?: number };

function lineSeriesTooltipFormatter(d: LineSeriesTooltipDatum): { name: string; value: number } {
  return { name: d.series ?? "", value: d.value ?? 0 };
}

function pieSliceTooltipFormatter(d: PieSliceTooltipDatum): { name: string; value: number } {
  return { name: d.type ?? "", value: d.value ?? 0 };
}

export function AdminStatsPanel() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { services } = useApp();
  const palette = usePlotPalette();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [paymentStats, setPaymentStats] = useState<AdminPaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "users" | "billing" | null>(null);
  const [period, setPeriod] = useState<Period>("week");

  const periodRange = useMemo(() => getAdminStatsPeriodRange(period), [period]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, payments] = await Promise.all([
        services.admin.getStats(),
        services.admin.getPaymentStats({
          startDate: periodRange.startDate,
          endDate: periodRange.endDate,
          groupBy: periodRange.groupBy,
        }),
      ]);
      setStats(data);
      setPaymentStats(payments);
    } catch {
      // silently fail; stats are supplementary
    } finally {
      setLoading(false);
    }
  }, [services.admin, periodRange]);

  useEffect(() => {
    void load();
  }, [load]);

  const revenueText = useMemo(() => formatRevenueSummary(paymentStats?.currencies), [paymentStats]);

  const periodButtons: { key: Period; label: string }[] = [
    { key: "week", label: t("admin.stats.thisWeek") },
    { key: "month", label: t("admin.stats.thisMonth") },
    { key: "year", label: t("admin.stats.thisYear") },
  ];

  const metricCards = useMemo((): { title: string; value: string | number; icon: ReactNode; accent: StatAccent }[] => {
    if (!stats || !paymentStats) return [];
    return [
      { title: t("admin.stats.users"), value: stats.usersTotal, icon: <UserOutlined />, accent: "primary" },
      { title: t("admin.stats.admins"), value: stats.adminsTotal, icon: <TeamOutlined />, accent: "primary" },
      { title: t("admin.stats.regularUsers"), value: stats.regularUsersTotal, icon: <AppstoreOutlined />, accent: "primary" },
      { title: t("admin.stats.accounts"), value: stats.accountsTotal, icon: <WalletOutlined />, accent: "primary" },
      { title: t("admin.stats.campaigns"), value: stats.trackedCampaignsTotal, icon: <BarChartOutlined />, accent: "primary" },
      { title: t("admin.stats.revenue"), value: revenueText, icon: <CreditCardOutlined />, accent: "primary" },
      { title: t("admin.stats.paid"), value: paymentStats.paidCount ?? 0, icon: <CheckCircleOutlined />, accent: "green" },
      { title: t("admin.stats.unpaid"), value: paymentStats.unpaidCount ?? 0, icon: <ClockCircleOutlined />, accent: "amber" },
    ];
  }, [stats, paymentStats, revenueText, t]);

  const revenueLineData = useMemo(() => {
    const paidLabel = t("admin.stats.paid");
    const unpaidLabel = t("admin.stats.unpaid");
    return buildRevenueLineChartData(paymentStats, paidLabel, unpaidLabel);
  }, [paymentStats, t]);

  const pieData = useMemo(() => buildCurrencyPieData(paymentStats), [paymentStats]);

  const onDownloadPdf = async () => {
    setExporting("pdf");
    try {
      const blob = await services.admin.downloadExecutivePdf({
        startDate: periodRange.startDate,
        endDate: periodRange.endDate,
      });
      downloadBlob(blob, "executive-summary.pdf");
      void message.success(t("admin.stats.exportPdfOk"));
    } catch {
      void message.error(t("admin.stats.exportFail"));
    } finally {
      setExporting(null);
    }
  };

  const onExportUsers = async () => {
    setExporting("users");
    try {
      const blob = await services.admin.exportUsersCsv();
      downloadBlob(blob, "users.csv");
      void message.success(t("admin.stats.exportCsvOk"));
    } catch {
      void message.error(t("admin.stats.exportFail"));
    } finally {
      setExporting(null);
    }
  };

  const onExportBilling = async () => {
    setExporting("billing");
    try {
      const blob = await services.admin.exportBillingHistoryCsv();
      downloadBlob(blob, "billing-history.csv");
      void message.success(t("admin.stats.exportCsvOk"));
    } catch {
      void message.error(t("admin.stats.exportFail"));
    } finally {
      setExporting(null);
    }
  };

  const chartCardHeader = (title: string, end?: ReactNode) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <Typography.Title level={5} style={{ margin: 0 }}>
        {title}
      </Typography.Title>
      {end}
    </div>
  );

  const chartEmpty = (height: number) => (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Typography.Text type="secondary">{t("common.noData")}</Typography.Text>
    </div>
  );

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.stats.title")}
        description={t("admin.stats.subtitle")}
        actions={
          <>
            <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
              {t("common.reload")}
            </Button>
            <Button icon={<SafetyCertificateOutlined />} onClick={() => navigate(Paths.adminAudit)} disabled={loading}>
              {t("admin.audit.title")}
            </Button>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "users", label: t("admin.stats.exportUsersCsv"), onClick: () => void onExportUsers() },
                  { key: "billing", label: t("admin.stats.exportBillingCsv"), onClick: () => void onExportBilling() },
                ],
              }}
            >
              <Button icon={<DownloadOutlined />} loading={exporting === "users" || exporting === "billing"} disabled={loading}>
                {t("common.export")}
              </Button>
            </Dropdown>
            <Button type="primary" icon={<FilePdfOutlined />} onClick={() => void onDownloadPdf()} loading={exporting === "pdf"} disabled={loading}>
              {t("admin.stats.downloadExecutivePdf")}
            </Button>
          </>
        }
      />

      {loading ? (
        <>
          <Row gutter={[16, 16]}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
              <Col key={k} xs={24} sm={12} lg={6}>
                <StatCard title="" value="" loading />
              </Col>
            ))}
          </Row>
          <Card style={{ marginTop: 24 }} loading />
        </>
      ) : (
        <>
          {/* KPI tiles */}
          <Row gutter={[16, 16]}>
            {metricCards.map((m) => (
              <Col key={m.title} xs={24} sm={12} lg={6}>
                <StatCard title={m.title} value={m.value} icon={m.icon} accent={m.accent} />
              </Col>
            ))}
          </Row>

          {/* Revenue line chart */}
          <Card style={{ marginTop: 24 }} styles={{ body: { padding: 20 } }}>
            {chartCardHeader(
              t("admin.stats.paymentsChart"),
              <Segmented
                size="small"
                value={period}
                onChange={(v) => setPeriod(v as Period)}
                options={periodButtons.map((b) => ({ label: b.label, value: b.key }))}
              />,
            )}

            {revenueLineData.length ? (
              <Line
                data={revenueLineData}
                xField="label"
                yField="value"
                seriesField="series"
                autoFit
                height={240}
                legend={{ position: "top" }}
                point={{ size: 4, shape: "circle" }}
                scale={{
                  color: {
                    domain: [t("admin.stats.paid"), t("admin.stats.unpaid")],
                    range: [palette[0], palette[4] ?? palette[1]],
                  },
                }}
                axis={{ x: { title: false }, y: { title: false } }}
                tooltip={{ formatter: lineSeriesTooltipFormatter }}
              />
            ) : (
              chartEmpty(240)
            )}
          </Card>

          {/* Currency breakdown pie */}
          <Card style={{ marginTop: 24 }} styles={{ body: { padding: 20 } }}>
            {chartCardHeader(t("admin.stats.categoryProportion"))}
            {pieData.length ? (
              <Pie
                data={pieData}
                angleField="value"
                colorField="type"
                autoFit
                height={220}
                radius={0.8}
                innerRadius={0.5}
                legend={{ position: "right" }}
                label={{ type: "inner", offset: "-30%", content: "{percentage}" }}
                scale={{ color: { range: palette } }}
                tooltip={{ formatter: pieSliceTooltipFormatter }}
              />
            ) : (
              chartEmpty(220)
            )}
          </Card>
        </>
      )}
    </PageContainer>
  );
}

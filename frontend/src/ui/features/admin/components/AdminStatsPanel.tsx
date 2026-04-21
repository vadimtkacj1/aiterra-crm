import {
  AppstoreOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Line, Pie } from "@ant-design/plots";
import dayjs from "dayjs";
import { App, Button, Card, Col, Row, Skeleton, Space, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { AdminPaymentStats, AdminStats } from "../../../../services/AdminService";
import { useApp } from "../../../../app/AppProviders";
import { Paths } from "../../../navigation/paths";
import { downloadBlob } from "../../../shared/utils/downloadBlob";
import { usePlotPalette } from "../../analytics/chart/analyticsPlotTheme";

type Period = "week" | "month" | "year";

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

  const periodRange = useMemo((): { startDate: string; endDate: string; groupBy: "day" | "month" } => {
    const today = dayjs();
    if (period === "week") {
      return {
        startDate: today.startOf("week").format("YYYY-MM-DD"),
        endDate: today.format("YYYY-MM-DD"),
        groupBy: "day",
      };
    }
    if (period === "month") {
      return {
        startDate: today.startOf("month").format("YYYY-MM-DD"),
        endDate: today.format("YYYY-MM-DD"),
        groupBy: "day",
      };
    }
    return {
      startDate: today.startOf("year").format("YYYY-MM-DD"),
      endDate: today.format("YYYY-MM-DD"),
      groupBy: "month",
    };
  }, [period]);

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
      // silently fail — stats are supplementary
    } finally {
      setLoading(false);
    }
  }, [services.admin, periodRange]);

  useEffect(() => {
    void load();
  }, [load]);

  const revenueText = useMemo(() => {
    if (!paymentStats?.currencies?.length) return "0.00";
    const parts = paymentStats.currencies
      .filter((x) => x.paidAmount > 0)
      .slice(0, 3)
      .map((x) => `${x.paidAmount.toFixed(2)} ${x.currency}`);
    return parts.length ? parts.join(" + ") : "0.00";
  }, [paymentStats]);

  const periodButtons: { key: Period; label: string }[] = [
    { key: "week", label: t("admin.stats.thisWeek") },
    { key: "month", label: t("admin.stats.thisMonth") },
    { key: "year", label: t("admin.stats.thisYear") },
  ];

  const metricCards = useMemo(() => {
    if (!stats || !paymentStats) return [];
    return [
      { title: t("admin.stats.users"), value: stats.usersTotal, icon: <UserOutlined /> },
      { title: t("admin.stats.admins"), value: stats.adminsTotal, icon: <TeamOutlined /> },
      { title: t("admin.stats.regularUsers"), value: stats.regularUsersTotal, icon: <AppstoreOutlined /> },
      { title: t("admin.stats.accounts"), value: stats.accountsTotal, icon: <WalletOutlined /> },
      { title: t("admin.stats.campaigns"), value: stats.trackedCampaignsTotal, icon: <BarChartOutlined /> },
      { title: t("admin.stats.revenue"), value: revenueText, icon: <CreditCardOutlined /> },
      { title: t("admin.stats.paid"), value: paymentStats.paidCount ?? 0, icon: <CheckCircleOutlined /> },
      { title: t("admin.stats.unpaid"), value: paymentStats.unpaidCount ?? 0, icon: <ClockCircleOutlined /> },
    ];
  }, [stats, paymentStats, revenueText, t]);

  const revenueLineData = useMemo(() => {
    if (!paymentStats?.buckets?.length) return [];
    const paidLabel = t("admin.stats.paid");
    const unpaidLabel = t("admin.stats.unpaid");
    return paymentStats.buckets.slice(0, 24).flatMap((b) => [
      { label: b.label, series: paidLabel, value: b.paidCount },
      { label: b.label, series: unpaidLabel, value: b.unpaidCount },
    ]);
  }, [paymentStats, t]);

  const pieData = useMemo(() => {
    if (!paymentStats?.currencies?.length) return [];
    return paymentStats.currencies
      .filter((c) => c.paidAmount > 0)
      .map((c) => ({ type: c.currency, value: parseFloat(c.paidAmount.toFixed(2)) }));
  }, [paymentStats]);

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

  return (
    <div style={{ background: "transparent", padding: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t("admin.stats.title")}
        </Typography.Title>
        <Space wrap size={[8, 8]}>
          <Button size="small" icon={<FilePdfOutlined />} onClick={() => void onDownloadPdf()} loading={exporting === "pdf"} disabled={loading}>
            {t("admin.stats.downloadExecutivePdf")}
          </Button>
          <Button size="small" onClick={() => void onExportUsers()} loading={exporting === "users"} disabled={loading}>
            {t("admin.stats.exportUsersCsv")}
          </Button>
          <Button size="small" onClick={() => void onExportBilling()} loading={exporting === "billing"} disabled={loading}>
            {t("admin.stats.exportBillingCsv")}
          </Button>
          <Button size="small" icon={<SafetyCertificateOutlined />} onClick={() => navigate(Paths.adminAudit)} disabled={loading}>
            {t("admin.audit.title")}
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => void load()} loading={loading} style={{ borderRadius: 10 }}>
            {t("common.reload")}
          </Button>
        </Space>
      </div>

      {loading ? (
        <>
          <Row gutter={[12, 12]}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
              <Col key={k} xs={12} sm={8} lg={6}>
                <Card bordered={false} style={{ borderRadius: 12 }}>
                  <Skeleton active paragraph={{ rows: 1 }} />
                </Card>
              </Col>
            ))}
          </Row>
          <div style={{ marginTop: 16 }}>
            <Card bordered={false} style={{ borderRadius: 12 }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* KPI cards */}
          <Row gutter={[12, 12]}>
            {metricCards.map((m) => (
              <Col key={m.title} xs={12} sm={8} lg={6}>
                <Card
                  bordered={false}
                  style={{ borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                  bodyStyle={{ padding: "14px 16px 12px" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                        {m.title}
                      </Typography.Text>
                      <Typography.Text strong style={{ fontSize: 26, lineHeight: 1.2 }}>
                        {m.value}
                      </Typography.Text>
                    </div>
                    <div style={{ color: "rgba(0,0,0,0.4)", fontSize: 18, paddingTop: 4, flexShrink: 0 }}>
                      {m.icon}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Revenue line chart */}
          <Card
            bordered={false}
            style={{ marginTop: 16, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            bodyStyle={{ padding: "20px 24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {t("admin.stats.paymentsChart")}
              </Typography.Title>
              <div style={{ display: "flex", gap: 0, border: "1px solid #d9d9d9", borderRadius: 8, overflow: "hidden" }}>
                {periodButtons.map((btn) => (
                  <button
                    key={btn.key}
                    onClick={() => setPeriod(btn.key)}
                    style={{
                      padding: "4px 14px",
                      fontSize: 13,
                      border: "none",
                      borderRight: btn.key !== "year" ? "1px solid #d9d9d9" : "none",
                      cursor: "pointer",
                      background: period === btn.key ? "#1677ff" : "#fff",
                      color: period === btn.key ? "#fff" : "rgba(0,0,0,0.88)",
                      fontWeight: period === btn.key ? 600 : 400,
                      transition: "background 0.15s",
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

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
                tooltip={{
                  formatter: (d: any) => ({ name: d?.series ?? "", value: d?.value ?? 0 }),
                }}
              />
            ) : (
              <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography.Text type="secondary">—</Typography.Text>
              </div>
            )}
          </Card>

          {/* Bottom row: paid/unpaid counts bar + currency pie */}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            {/* Views — paid vs unpaid counts per period */}
            <Col xs={24} md={12}>
              <Card
                bordered={false}
                style={{ borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                bodyStyle={{ padding: "20px 24px" }}
              >
                <Typography.Title level={5} style={{ margin: "0 0 16px" }}>
                  {t("admin.stats.views")}
                </Typography.Title>
                {revenueLineData.length ? (
                  <Line
                    data={revenueLineData}
                    xField="label"
                    yField="value"
                    seriesField="series"
                    autoFit
                    height={220}
                    legend={{ position: "top" }}
                    point={{ size: 3, shape: "circle" }}
                    scale={{
                      color: {
                        domain: [t("admin.stats.paid"), t("admin.stats.unpaid")],
                        range: [palette[1], palette[2]],
                      },
                    }}
                    axis={{ x: { title: false }, y: { title: false } }}
                    tooltip={{
                      formatter: (d: any) => ({ name: d?.series ?? "", value: d?.value ?? 0 }),
                    }}
                  />
                ) : (
                  <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography.Text type="secondary">—</Typography.Text>
                  </div>
                )}
              </Card>
            </Col>

            {/* Currency proportion pie */}
            <Col xs={24} md={12}>
              <Card
                bordered={false}
                style={{ borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                bodyStyle={{ padding: "20px 24px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    {t("admin.stats.categoryProportion")}
                  </Typography.Title>
                </div>
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
                    tooltip={{
                      formatter: (d: any) => ({ name: d?.type ?? "", value: d?.value ?? 0 }),
                    }}
                  />
                ) : (
                  <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography.Text type="secondary">—</Typography.Text>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}

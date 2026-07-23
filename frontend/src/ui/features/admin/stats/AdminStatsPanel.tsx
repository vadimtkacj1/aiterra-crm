import {
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  LayoutGrid,
  PieChart,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { Line, Pie } from "@ant-design/plots";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MenuDropdown } from "@/components/ui/menu-compat";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { message } from "@/lib/toast";
import { cn } from "@/lib/utils";
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
import { downloadBlob } from "@/ui/shared/utils/downloadBlob";
import { EmptyState } from "@/ui/shared/components/EmptyState";
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
      { title: t("admin.stats.users"), value: stats.usersTotal, icon: <User />, accent: "primary" },
      { title: t("admin.stats.admins"), value: stats.adminsTotal, icon: <Users />, accent: "primary" },
      { title: t("admin.stats.regularUsers"), value: stats.regularUsersTotal, icon: <LayoutGrid />, accent: "primary" },
      { title: t("admin.stats.accounts"), value: stats.accountsTotal, icon: <Wallet />, accent: "primary" },
      { title: t("admin.stats.campaigns"), value: stats.trackedCampaignsTotal, icon: <BarChart3 />, accent: "primary" },
      { title: t("admin.stats.revenue"), value: revenueText, icon: <CreditCard />, accent: "primary" },
      { title: t("admin.stats.paid"), value: paymentStats.paidCount ?? 0, icon: <CheckCircle2 />, accent: "green" },
      { title: t("admin.stats.unpaid"), value: paymentStats.unpaidCount ?? 0, icon: <Clock />, accent: "amber" },
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
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h3 className="m-0 text-base font-semibold text-foreground">{title}</h3>
      {end}
    </div>
  );

  const chartEmpty = (height: number, icon: ReactNode) => (
    <div className="flex items-center justify-center" style={{ height }}>
      <EmptyState
        icon={icon}
        title={t("common.noData")}
        description={t("admin.stats.chartEmptyHint")}
        style={{ padding: 0 }}
      />
    </div>
  );

  /** Full skeleton only on first load; period switches keep the layout in place. */
  const initialLoading = loading && !stats;

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.stats.title")}
        description={t("admin.stats.subtitle")}
        actions={
          <MenuDropdown
            align="end"
            items={[
              { key: "users", label: t("admin.stats.exportUsersCsv"), onClick: () => void onExportUsers() },
              { key: "billing", label: t("admin.stats.exportBillingCsv"), onClick: () => void onExportBilling() },
              { type: "divider" },
              {
                key: "pdf",
                icon: <FileText className="size-4" />,
                label: t("admin.stats.downloadExecutivePdf"),
                onClick: () => void onDownloadPdf(),
              },
            ]}
          >
            <Button variant="outline" aria-label={t("common.export")} disabled={loading || exporting !== null}>
              {exporting !== null ? (
                <Spinner size="sm" className="text-current" aria-hidden="true" />
              ) : (
                <Download aria-hidden="true" />
              )}
              {t("common.export")}
            </Button>
          </MenuDropdown>
        }
      />

      {initialLoading ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
              <StatCard key={k} title="" value="" loading />
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Card className="p-5 lg:col-span-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-4 h-60 w-full" />
            </Card>
            <Card className="p-5 lg:col-span-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-4 h-60 w-full" />
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metricCards.map((m) => (
              <StatCard key={m.title} title={m.title} value={m.value} icon={m.icon} accent={m.accent} />
            ))}
          </div>

          <div
            aria-busy={loading}
            className={cn("mt-6 grid gap-6 lg:grid-cols-5", loading && "opacity-60 transition-opacity")}
          >
            {/* Revenue line chart */}
            <Card className="p-5 lg:col-span-3">
              {chartCardHeader(
                t("admin.stats.paymentsChart"),
                <Segmented
                  size="sm"
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
                chartEmpty(240, <BarChart3 aria-hidden="true" className="size-12" strokeWidth={1.25} />)
              )}
            </Card>

            {/* Currency breakdown pie */}
            <Card className="p-5 lg:col-span-2">
              {chartCardHeader(t("admin.stats.categoryProportion"))}
              {pieData.length ? (
                <Pie
                  data={pieData}
                  angleField="value"
                  colorField="type"
                  autoFit
                  height={240}
                  radius={0.8}
                  innerRadius={0.5}
                  legend={{ position: "bottom" }}
                  label={{ type: "inner", offset: "-30%", content: "{percentage}" }}
                  scale={{ color: { range: palette } }}
                  tooltip={{ formatter: pieSliceTooltipFormatter }}
                />
              ) : (
                chartEmpty(240, <PieChart aria-hidden="true" className="size-12" strokeWidth={1.25} />)
              )}
            </Card>
          </div>
        </>
      )}
    </PageContainer>
  );
}

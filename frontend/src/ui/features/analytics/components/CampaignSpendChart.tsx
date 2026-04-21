import { Bar } from "@ant-design/plots";
import { Card } from "antd";
import { useTranslation } from "react-i18next";
import type { CampaignSummaryRow } from "../../../../domain/CampaignAnalytics";
import { usePlotPalette } from "../chart/analyticsPlotTheme";

interface CampaignSpendChartProps {
  rows: CampaignSummaryRow[];
  currency: string;
}

export function CampaignSpendChart({ rows, currency }: CampaignSpendChartProps) {
  const { t } = useTranslation();
  const palette = usePlotPalette();
  const withSpend = rows.filter((r) => r.spend > 0);
  if (withSpend.length === 0) {
    return null;
  }

  const data = withSpend.map((r) => ({
    name: r.campaignName.length > 44 ? `${r.campaignName.slice(0, 43)}…` : r.campaignName,
    value: r.spend,
    key: r.campaignId,
  }));

  const h = Math.max(200, data.length * 40 + 72);

  return (
    <Card size="small" title={t("analytics.chart.spendByCampaign")}>
      <Bar
        data={data}
        xField="value"
        yField="name"
        seriesField="key"
        colorField="key"
        autoFit
        height={h}
        insetLeft={4}
        insetRight={8}
        legend={false}
        scale={{
          color: { range: palette },
        }}
        style={{
          maxWidth: 24,
          radiusTopLeft: 6,
          radiusTopRight: 6,
          radiusBottomRight: 6,
          radiusBottomLeft: 6,
        }}
        axis={{
          x: {
            title: false,
            labelFormatter: (d: string) => `${Number(d).toLocaleString()} ${currency}`,
          },
          y: { title: false },
        }}
        interaction={{ elementHighlight: { background: true } }}
      />
    </Card>
  );
}

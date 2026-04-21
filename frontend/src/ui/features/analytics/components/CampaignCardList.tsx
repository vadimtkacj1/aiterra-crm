import { Card, Collapse, Flex, Space, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { CampaignSummaryRow } from "../../../../domain/CampaignAnalytics";

interface CampaignCardListProps {
  rows: CampaignSummaryRow[];
  currency: string;
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", gap: 8 }}>
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        {label}
      </Typography.Text>
      <Typography.Text strong style={{ fontSize: 13, textAlign: "right" }}>
        {value}
      </Typography.Text>
    </div>
  );
}

export function CampaignCardList({ rows, currency }: CampaignCardListProps) {
  const { t } = useTranslation();

  const money = (v: number | undefined) => `${(v ?? 0).toFixed(4)} ${currency}`;
  const int = (v: number | undefined) => (v ?? 0).toLocaleString();
  const pct = (v: number | undefined) => `${(v ?? 0).toFixed(2)}%`;

  return (
    <Flex vertical gap={8} style={{ width: "100%" }}>
      {rows.map((row) => (
        <Card
          key={row.campaignId}
          size="small"
          styles={{ body: { padding: 12 } }}
        >
          <Typography.Text strong style={{ fontSize: 14, display: "block", marginBottom: 8 }}>
            {row.campaignName}
          </Typography.Text>
          <MetricRow label={t("analytics.table.impressions")} value={int(row.impressions)} />
          <MetricRow label={t("analytics.table.clicks")} value={int(row.clicks)} />
          <MetricRow label={t("analytics.table.ctr")} value={pct(row.ctr)} />
          <MetricRow label={t("analytics.table.spend")} value={`${row.spend.toFixed(2)} ${currency}`} />
          <MetricRow label={t("analytics.table.conversions")} value={int(row.conversions)} />
          <MetricRow label={t("analytics.table.reach")} value={int(row.reach)} />
          <MetricRow label={t("analytics.table.frequency")} value={(row.frequency ?? 0).toFixed(2)} />
          <MetricRow label={t("analytics.table.cpc")} value={money(row.cpc)} />
          <MetricRow label={t("analytics.table.cpm")} value={money(row.cpm)} />

          <Collapse
            ghost
            size="small"
            style={{ marginTop: 8 }}
            items={[
              {
                key: "more",
                label: t("analytics.table.moreMetrics"),
                children: (
                  <Flex vertical gap={0} style={{ width: "100%" }}>
                    <MetricRow label={t("analytics.table.inlineLinkClicks")} value={int(row.inlineLinkClicks)} />
                    <MetricRow label={t("analytics.table.inlineLinkClickCtr")} value={pct(row.inlineLinkClickCtr)} />
                    <MetricRow
                      label={t("analytics.table.costPerInlineLinkClick")}
                      value={money(row.costPerInlineLinkClick)}
                    />
                    <MetricRow label={t("analytics.table.uniqueClicks")} value={int(row.uniqueClicks)} />
                    <MetricRow label={t("analytics.table.uniqueCtr")} value={pct(row.uniqueCtr)} />
                    <MetricRow
                      label={t("analytics.table.costPerUniqueClick")}
                      value={money(row.costPerUniqueClick)}
                    />
                    <MetricRow label={t("analytics.table.outboundClicks")} value={int(row.outboundClicks)} />
                    <MetricRow label={t("analytics.table.linkClicks")} value={int(row.linkClicks)} />
                    <MetricRow label={t("analytics.table.landingPageViews")} value={int(row.landingPageViews)} />
                    <MetricRow label={t("analytics.table.postEngagement")} value={int(row.postEngagement)} />
                    <MetricRow label={t("analytics.table.videoViews")} value={int(row.videoViews)} />
                    <Typography.Text strong style={{ display: "block", marginTop: 8, fontSize: 12 }}>
                      {t("analytics.table.actionsDetail")}
                    </Typography.Text>
                    {(row.actionBreakdown?.length ?? 0) === 0 ? (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {t("analytics.table.noActionsDetail")}
                      </Typography.Text>
                    ) : (
                      <Space wrap size={[4, 4]} style={{ marginTop: 4 }}>
                        {(row.actionBreakdown ?? []).map((a) => (
                          <Tag key={`${row.campaignId}-${a.actionType}`}>
                            {a.actionType}: {a.value.toLocaleString()}
                          </Tag>
                        ))}
                      </Space>
                    )}
                  </Flex>
                ),
              },
            ]}
          />
        </Card>
      ))}
    </Flex>
  );
}

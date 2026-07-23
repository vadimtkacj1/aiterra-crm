import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CampaignSummaryRow } from "@/domain/CampaignAnalytics";

interface CampaignCardListProps {
  rows: CampaignSummaryRow[];
  currency: string;
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-end text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function CampaignCardList({ rows, currency }: CampaignCardListProps) {
  const { t } = useTranslation();

  const money = (v: number | undefined) => `${(v ?? 0).toFixed(4)} ${currency}`;
  const int = (v: number | undefined) => (v ?? 0).toLocaleString();
  const pct = (v: number | undefined) => `${(v ?? 0).toFixed(2)}%`;

  return (
    <div className="flex w-full flex-col gap-2">
      {rows.map((row) => (
        <Card key={row.campaignId} className="p-3">
          <span className="mb-2 block text-sm font-semibold">{row.campaignName}</span>
          <MetricRow label={t("analytics.table.impressions")} value={int(row.impressions)} />
          <MetricRow label={t("analytics.table.clicks")} value={int(row.clicks)} />
          <MetricRow label={t("analytics.table.ctr")} value={pct(row.ctr)} />
          <MetricRow label={t("analytics.table.spend")} value={`${row.spend.toFixed(2)} ${currency}`} />
          <MetricRow label={t("analytics.table.conversions")} value={int(row.conversions)} />
          <MetricRow label={t("analytics.table.reach")} value={int(row.reach)} />
          <MetricRow label={t("analytics.table.frequency")} value={(row.frequency ?? 0).toFixed(2)} />
          <MetricRow label={t("analytics.table.cpc")} value={money(row.cpc)} />
          <MetricRow label={t("analytics.table.cpm")} value={money(row.cpm)} />

          <Accordion type="multiple" className="mt-2">
            <AccordionItem value="more" className="border-b-0">
              <AccordionTrigger className="py-2 text-[13px]">
                {t("analytics.table.moreMetrics")}
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="flex w-full flex-col">
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
                  <span className="mt-2 block text-xs font-semibold">
                    {t("analytics.table.actionsDetail")}
                  </span>
                  {(row.actionBreakdown?.length ?? 0) === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {t("analytics.table.noActionsDetail")}
                    </span>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(row.actionBreakdown ?? []).map((a) => (
                        <Badge key={`${row.campaignId}-${a.actionType}`} variant="default">
                          {a.actionType}: {a.value.toLocaleString()}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      ))}
    </div>
  );
}

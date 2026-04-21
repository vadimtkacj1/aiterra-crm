import type { TFunction } from "i18next";

import type { CampaignSummaryRow } from "../../../../domain/CampaignAnalytics";

export type CampaignGoalKind = "leads" | "sales" | "engagement" | "traffic" | "general";

/** Map Meta campaign.objective to a coarse goal used for KPIs and table sorting. */
export function classifyCampaignObjective(objective: string | undefined): CampaignGoalKind {
  const o = (objective ?? "").toUpperCase();
  if (!o) return "general";
  if (o.includes("LEAD")) return "leads";
  if (
    o.includes("PURCHASE") ||
    o.includes("CONVERSION") ||
    o.includes("CATALOG") ||
    o.includes("OUTCOME_SALES")
  ) {
    return "sales";
  }
  if (
    o.includes("ENGAGEMENT") ||
    o.includes("VIDEO") ||
    o.includes("REACH") ||
    o.includes("AWARENESS")
  ) {
    return "engagement";
  }
  if (o.includes("LINK") || o.includes("CLICK") || o.includes("TRAFFIC")) return "traffic";
  return "general";
}

export function primaryGoalSortValue(row: CampaignSummaryRow): number {
  const kind = classifyCampaignObjective(row.objective);
  switch (kind) {
    case "leads":
      return row.leads ?? 0;
    case "sales":
      return row.purchases ?? 0;
    case "engagement": {
      const pe = row.postEngagement ?? 0;
      const vv = row.videoViews ?? 0;
      return Math.max(pe, vv);
    }
    case "traffic":
      return row.linkClicks ?? row.inlineLinkClicks ?? row.clicks;
    default:
      return row.conversions;
  }
}

export function getPrimaryGoalDisplay(row: CampaignSummaryRow, t: TFunction): { label: string; value: string } {
  const kind = classifyCampaignObjective(row.objective);
  switch (kind) {
    case "leads":
      return { label: t("meta.result.leads"), value: (row.leads ?? 0).toLocaleString() };
    case "sales": {
      const roas = (row.roas ?? 0).toFixed(2);
      const purchases = row.purchases ?? 0;
      return { label: t("meta.result.purchasesRoas"), value: `${purchases.toLocaleString()} · ${roas}x` };
    }
    case "engagement": {
      const pe = row.postEngagement ?? 0;
      const vv = row.videoViews ?? 0;
      if (vv > pe) return { label: t("meta.result.videoViews"), value: vv.toLocaleString() };
      return { label: t("meta.result.postEngagement"), value: pe.toLocaleString() };
    }
    case "traffic": {
      const lc = row.linkClicks ?? row.inlineLinkClicks ?? row.clicks;
      return { label: t("meta.result.linkClicks"), value: lc.toLocaleString() };
    }
    default:
      return { label: t("meta.result.conversions"), value: row.conversions.toLocaleString() };
  }
}

export function getCostPerPrimaryGoal(row: CampaignSummaryRow, t: TFunction): { label: string; value: string } | null {
  const kind = classifyCampaignObjective(row.objective);
  const spend = row.spend;
  if (spend <= 0) return null;

  switch (kind) {
    case "leads": {
      const n = row.leads ?? 0;
      if (n <= 0) return null;
      return { label: t("meta.deepdive.costPerLead"), value: (spend / n).toFixed(2) };
    }
    case "sales": {
      const n = row.purchases ?? 0;
      if (n <= 0) return null;
      return { label: t("meta.deepdive.costPerPurchase"), value: (spend / n).toFixed(2) };
    }
    case "engagement": {
      const pe = row.postEngagement ?? 0;
      const vv = row.videoViews ?? 0;
      const n = vv > pe ? vv : pe;
      if (n <= 0) return null;
      const label = vv > pe ? t("meta.deepdive.costPerVideoView") : t("meta.deepdive.costPerEngagement");
      return { label, value: (spend / n).toFixed(2) };
    }
    case "traffic": {
      const n = row.linkClicks ?? row.inlineLinkClicks ?? 0;
      if (n <= 0) return null;
      return { label: t("meta.deepdive.costPerLinkClick"), value: (spend / n).toFixed(2) };
    }
    default:
      if (row.conversions <= 0) return null;
      return { label: t("meta.deepdive.costPerResult"), value: (spend / row.conversions).toFixed(2) };
  }
}

/** i18n key under meta.goalType.* */
export function goalKindI18nKey(kind: CampaignGoalKind): string {
  switch (kind) {
    case "leads":
      return "meta.goalType.leads";
    case "sales":
      return "meta.goalType.sales";
    case "engagement":
      return "meta.goalType.engagement";
    case "traffic":
      return "meta.goalType.traffic";
    default:
      return "meta.goalType.general";
  }
}

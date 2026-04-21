/** Розбір actions з Meta Insights. */
export interface ActionMetricRow {
  actionType: string;
  value: number;
}

/** Щоденна точка (time-series) з Meta account insights. */
export interface DailyMetricRow {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

/** Billing transaction from Meta ad account. */
export interface MetaBillingTransaction {
  id: string;
  time: string;
  amount: number;
  currency: string;
  status: string;
  txType: string;
}

/** Ad account billing summary from Meta. */
export interface MetaAccountBilling {
  accountName: string;
  currency: string;
  amountSpent: number;
  balance: number;
  spendCap: number;
  accountStatus: string;
  fundingSource: string;
  transactions: MetaBillingTransaction[];
}

/** Campaign objective type returned from Meta API. */
export type CampaignObjective =
  | "LEAD_GENERATION"
  | "CONVERSIONS"
  | "LINK_CLICKS"
  | "POST_ENGAGEMENT"
  | "REACH"
  | "BRAND_AWARENESS"
  | "VIDEO_VIEWS"
  | "APP_INSTALLS"
  | "MESSAGES"
  | string;

/** Campaign delivery status from Meta. */
export type CampaignStatus = "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED" | string;

/** Агрегированные метрики рекламной кампании (Meta / Google). */
export interface CampaignSummaryRow {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  // Campaign metadata
  objective?: CampaignObjective;
  status?: CampaignStatus;
  // Goal-specific metrics
  leads?: number;
  purchases?: number;
  purchaseValue?: number;
  roas?: number;
  // Reach / engagement metrics
  reach?: number;
  frequency?: number;
  cpc?: number;
  cpm?: number;
  inlineLinkClicks?: number;
  inlineLinkClickCtr?: number;
  costPerInlineLinkClick?: number;
  uniqueClicks?: number;
  uniqueCtr?: number;
  costPerUniqueClick?: number;
  outboundClicks?: number;
  outboundClicksCtr?: number;
  linkClicks?: number;
  landingPageViews?: number;
  postEngagement?: number;
  videoViews?: number;
  actionBreakdown?: ActionMetricRow[];
}

export interface CampaignAnalyticsSnapshot {
  currency: string;
  /** Fallback label if `periodI18nKey` is not set (e.g. API response). */
  periodLabel: string;
  /** i18n key for the period line when using localized mock/API contracts. */
  periodI18nKey?: string;
  /** ISO timestamp of when the data was fetched from Meta API. */
  updatedAt?: string;
  /** Daily time-series from Meta account insights (last 30 days). */
  dailyBreakdown?: DailyMetricRow[];
  totals: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    leads?: number;
    purchases?: number;
    purchaseValue?: number;
    roas?: number;
    reach?: number;
    frequency?: number;
    cpc?: number;
    cpm?: number;
    inlineLinkClicks?: number;
    inlineLinkClickCtr?: number;
    uniqueClicks?: number;
    uniqueCtr?: number;
    outboundClicks?: number;
    outboundClicksCtr?: number;
    linkClicks?: number;
    landingPageViews?: number;
    postEngagement?: number;
    videoViews?: number;
    costPerInlineLinkClick?: number;
    costPerUniqueClick?: number;
    /** Present in some mocks; API totals usually omit per-action breakdown. */
    actionBreakdown?: ActionMetricRow[];
  };
  rows: CampaignSummaryRow[];
}

// ── Ad / Creative level ───────────────────────────────────────────────────────

export interface AdCreative {
  adId: string;
  adName: string;
  thumbnailUrl: string;
  previewUrl: string;
  videoUrl: string;
  permalinkUrl: string;
  spend: number;
  results: number;
  ctr: number;
  impressions: number;
  clicks: number;
}

export interface CampaignAdsData {
  campaignId: string;
  campaignName: string;
  objective: string;
  currency: string;
  ads: AdCreative[];
}

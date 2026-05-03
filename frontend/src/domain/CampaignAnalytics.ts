export interface ActionMetricRow {
  actionType: string;
  value: number;
}

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

export interface MetaBillingTransaction {
  id: string;
  time: string;
  amount: number;
  currency: string;
  status: string;
  txType: string;
}

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

export type CampaignStatus = "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED" | string;

export interface CampaignSummaryRow {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  objective?: CampaignObjective;
  status?: CampaignStatus;
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
  periodLabel: string;
  periodI18nKey?: string;
  updatedAt?: string;
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
    actionBreakdown?: ActionMetricRow[];
  };
  rows: CampaignSummaryRow[];
}

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

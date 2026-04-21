from pydantic import BaseModel, Field


class ActionMetric(BaseModel):
    actionType: str
    value: int


class DailyMetric(BaseModel):
    date: str
    impressions: int
    clicks: int
    spend: float
    conversions: int
    reach: int = 0
    ctr: float = 0.0
    cpc: float = 0.0
    cpm: float = 0.0


class MetaBillingTransaction(BaseModel):
    id: str
    time: str
    amount: float
    currency: str
    status: str
    txType: str


class MetaAccountBilling(BaseModel):
    accountName: str
    currency: str
    amountSpent: float
    balance: float
    spendCap: float
    accountStatus: str
    fundingSource: str
    transactions: list[MetaBillingTransaction]


class CampaignRow(BaseModel):
    campaignId: str
    campaignName: str
    impressions: int
    clicks: int
    spend: float
    conversions: int
    ctr: float
    # Campaign metadata
    objective: str = ""
    status: str = "ACTIVE"
    # Goal-specific metrics
    leads: int = 0
    purchases: int = 0
    purchaseValue: float = 0.0
    roas: float = 0.0
    # Reach / engagement metrics
    reach: int = 0
    frequency: float = 0.0
    cpc: float = 0.0
    cpm: float = 0.0
    inlineLinkClicks: int = 0
    inlineLinkClickCtr: float = 0.0
    costPerInlineLinkClick: float = 0.0
    uniqueClicks: int = 0
    uniqueCtr: float = 0.0
    costPerUniqueClick: float = 0.0
    outboundClicks: int = 0
    linkClicks: int = 0
    landingPageViews: int = 0
    postEngagement: int = 0
    videoViews: int = 0
    actionBreakdown: list[ActionMetric] = Field(default_factory=list)


class CampaignTotals(BaseModel):
    impressions: int
    clicks: int
    spend: float
    conversions: int
    leads: int = 0
    purchases: int = 0
    purchaseValue: float = 0.0
    roas: float = 0.0
    reach: int = 0
    frequency: float = 0.0
    cpc: float = 0.0
    cpm: float = 0.0
    inlineLinkClicks: int = 0
    uniqueClicks: int = 0
    outboundClicks: int = 0
    linkClicks: int = 0
    landingPageViews: int = 0
    postEngagement: int = 0
    videoViews: int = 0
    costPerInlineLinkClick: float = 0.0
    costPerUniqueClick: float = 0.0


class CampaignSnapshot(BaseModel):
    currency: str
    periodLabel: str
    periodI18nKey: str | None = None
    updatedAt: str = ""
    totals: CampaignTotals
    rows: list[CampaignRow]
    dailyBreakdown: list[DailyMetric] = Field(default_factory=list)


# ── Ad / Creative level ────────────────────────────────────────────────────────

class AdCreative(BaseModel):
    adId: str
    adName: str
    thumbnailUrl: str = ""
    previewUrl: str = ""
    videoUrl: str = ""
    permalinkUrl: str = ""
    spend: float = 0.0
    results: int = 0
    ctr: float = 0.0
    impressions: int = 0
    clicks: int = 0


class CampaignAds(BaseModel):
    campaignId: str
    campaignName: str
    objective: str = ""
    currency: str
    ads: list[AdCreative] = Field(default_factory=list)


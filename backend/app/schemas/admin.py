from pydantic import BaseModel


class UpdateUserRequest(BaseModel):
    displayName: str
    role: str


class UserBusinessMetaOut(BaseModel):
    """Owner business + optional linked Meta campaign for admin editing."""

    accountId: int | None = None
    metaCampaignId: str | None = None
    metaCampaignName: str | None = None


class UserBusinessMetaUpdateRequest(BaseModel):
    metaCampaignId: str | None = None
    metaCampaignName: str | None = None


class UserBusinessGoogleOut(BaseModel):
    """Owner business + optional Google Ads API credentials (secrets never returned)."""

    accountId: int | None = None
    customerId: str | None = None
    loginCustomerId: str | None = None
    hasCredentials: bool = False


class UserBusinessGoogleUpdateRequest(BaseModel):
    customerId: str | None = None
    developerToken: str | None = None
    refreshToken: str | None = None
    loginCustomerId: str | None = None


class ResetPasswordRequest(BaseModel):
    password: str


class AccountMemberOut(BaseModel):
    userId: int
    accountId: int
    roleInAccount: str


class AdminAccountOut(BaseModel):
    id: int
    name: str
    membersCount: int


class AdminStats(BaseModel):
    usersTotal: int
    adminsTotal: int
    regularUsersTotal: int
    accountsTotal: int
    trackedCampaignsTotal: int
    metaConnected: bool


class AdminPaymentCurrencySummary(BaseModel):
    currency: str
    paidAmount: float
    unpaidAmount: float


class AdminPaymentStatsBucket(BaseModel):
    label: str
    paidCount: int
    unpaidCount: int


class AdminPaymentStatsOut(BaseModel):
    paidCount: int
    unpaidCount: int
    availableYears: list[int]
    currencies: list[AdminPaymentCurrencySummary]
    buckets: list[AdminPaymentStatsBucket]


class AdminAuditLogOut(BaseModel):
    id: int
    createdAt: str
    adminUserId: int | None
    adminEmail: str | None
    action: str
    resourceType: str | None
    resourceId: str | None
    detail: str | None


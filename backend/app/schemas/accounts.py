from pydantic import BaseModel


class AccountOut(BaseModel):
    id: int
    name: str
    hasMeta: bool = False
    hasGoogle: bool = False


class CreateAccountRequest(BaseModel):
    name: str
    metaCampaignId: str | None = None
    metaCampaignName: str | None = None


class AssignMemberRequest(BaseModel):
    userId: int
    roleInAccount: str = "member"


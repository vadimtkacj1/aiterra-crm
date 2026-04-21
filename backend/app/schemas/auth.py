from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    displayName: str
    role: str


class LoginResponse(BaseModel):
    accessToken: str
    user: UserOut


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str


from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    displayName: str
    role: str


class LoginResponse(BaseModel):
    accessToken: str
    user: UserOut


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str


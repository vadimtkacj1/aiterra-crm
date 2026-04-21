from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, LoginRequest, LoginResponse, UserOut
from app.services.security import hash_password, verify_password
from app.services.jwt_service import create_access_token

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user: User | None = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid_credentials")

    token = create_access_token(user_id=user.id, role=user.role)
    return LoginResponse(
        accessToken=token,
        user=UserOut(
            id=user.id,
            email=user.email,
            displayName=user.display_name,
            role=user.role,
        ),
    )


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if not verify_password(payload.currentPassword, user.password_hash):
        raise HTTPException(status_code=400, detail="invalid_current_password")
    new_pw = (payload.newPassword or "").strip()
    if len(new_pw) < 8:
        raise HTTPException(status_code=400, detail="password_too_short")
    if new_pw == payload.currentPassword:
        raise HTTPException(status_code=400, detail="password_unchanged")
    user.password_hash = hash_password(new_pw)
    db.add(user)
    db.commit()
    return {"ok": True}


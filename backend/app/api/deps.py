from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.membership import AccountMembership
from app.services.jwt_service import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="invalid_token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_user")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="forbidden")
    return user


def forbid_admin_client_card_write(user: User) -> None:
    """Admins may view a client's saved card but not add/change/remove it via API."""
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="admin_readonly_billing_card")


def require_account_member(account_id: int, db: Session, user: User) -> AccountMembership:
    membership = (
        db.query(AccountMembership)
        .filter(AccountMembership.account_id == account_id, AccountMembership.user_id == user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="forbidden")
    return membership


import logging

from sqlalchemy.orm import Session

from app.core.settings import settings
from app.db.session import SessionLocal
from app.models.account import Account
from app.models.integration_meta import MetaIntegration
from app.models.membership import AccountMembership
from app.models.user import User
from app.services.meta_graph import fetch_meta_ad_accounts, normalize_meta_ad_account_id
from app.services.security import hash_password

logger = logging.getLogger(__name__)


def seed_admin() -> None:
    db: Session = SessionLocal()
    try:
        email = settings.seed_admin_email.lower()
        admin = db.query(User).filter(User.email == email).first()
        if not admin:
            admin = User(
                email=email,
                display_name="Administrator",
                role="admin",
                password_hash=hash_password(settings.seed_admin_password),
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # Ensure at least one demo account exists and the admin is a member.
        demo = db.query(Account).filter(Account.name == "Demo Account").first()
        if not demo:
            demo = Account(name="Demo Account")
            db.add(demo)
            db.commit()
            db.refresh(demo)

        m = (
            db.query(AccountMembership)
            .filter(AccountMembership.user_id == admin.id, AccountMembership.account_id == demo.id)
            .first()
        )
        if not m:
            db.add(AccountMembership(user_id=admin.id, account_id=demo.id, role_in_account="owner"))
            db.commit()

        tok = (settings.meta_seed_access_token or "").strip()
        if tok:
            ad_raw = (settings.meta_seed_ad_account_id or "").strip()
            if ad_raw:
                ad_id = normalize_meta_ad_account_id(ad_raw)
            else:
                accounts, err = fetch_meta_ad_accounts(tok)
                if err:
                    logger.warning("meta seed: could not list ad accounts: %s", err)
                    ad_id = None
                elif not accounts:
                    logger.warning("meta seed: no ad accounts for token")
                    ad_id = None
                else:
                    ad_id = accounts[0]["id"]
            if ad_id:
                any_integration = db.query(MetaIntegration).first()
                if not any_integration:
                    db.add(
                        MetaIntegration(
                            account_id=demo.id,
                            access_token=tok,
                            ad_account_id=ad_id,
                        )
                    )
                    db.commit()
    finally:
        db.close()


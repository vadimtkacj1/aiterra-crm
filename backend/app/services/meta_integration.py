from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.integration_meta import MetaIntegration


def get_global_meta_integration(db: Session) -> MetaIntegration | None:
    return db.scalar(select(MetaIntegration).order_by(MetaIntegration.id.asc()))


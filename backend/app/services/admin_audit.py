"""Record admin actions for audit trail."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.admin_audit_log import AdminAuditLog
from app.models.user import User


def log_admin_action(
    db: Session,
    admin: User | None,
    action: str,
    *,
    resource_type: str | None = None,
    resource_id: str | None = None,
    detail: dict[str, Any] | str | None = None,
) -> None:
    if isinstance(detail, dict):
        detail_str = json.dumps(detail, ensure_ascii=False)[:8000]
    else:
        detail_str = (detail or None) if isinstance(detail, str) else None
    row = AdminAuditLog(
        admin_user_id=admin.id if admin else None,
        action=action[:96],
        resource_type=(resource_type[:64] if resource_type else None),
        resource_id=(resource_id[:128] if resource_id else None),
        detail=detail_str,
    )
    db.add(row)

"""Executive PDF report and CSV exports for admin (no Z-Credit calls — DB only)."""

from __future__ import annotations

import csv
import io
from collections import defaultdict
from datetime import datetime, timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.billing_instruction_history import BillingInstructionHistory
from app.models.campaign import TrackedCampaign
from app.models.user import User
from app.services.meta_integration import get_global_meta_integration


def _utc_now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def build_users_csv(db: Session) -> bytes:
    rows = db.query(User).order_by(User.id.asc()).all()
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["id", "email", "displayName", "role"])
    for u in rows:
        w.writerow([u.id, u.email, u.display_name, u.role])
    return ("\ufeff" + out.getvalue()).encode("utf-8")


def build_billing_history_csv(db: Session, *, limit: int = 2000) -> bytes:
    rows = (
        db.query(BillingInstructionHistory)
        .order_by(BillingInstructionHistory.id.desc())
        .limit(limit)
        .all()
    )
    account_ids = {r.account_id for r in rows}
    names = {a.id: a.name for a in db.query(Account).filter(Account.id.in_(account_ids)).all()} if account_ids else {}
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(
        [
            "historyId",
            "accountId",
            "accountName",
            "chargeType",
            "amount",
            "currency",
            "description",
            "recordStatus",
            "paymentDocId",
            "paymentRecurringId",
            "createdAt",
            "closedAt",
            "createdByAdminId",
        ]
    )
    for r in rows:
        ca = r.created_at
        created = ca.isoformat() if hasattr(ca, "isoformat") else str(ca)
        cl = r.closed_at
        closed = cl.isoformat() if cl and hasattr(cl, "isoformat") else ("" if cl is None else str(cl))
        w.writerow(
            [
                r.id,
                r.account_id,
                names.get(r.account_id, ""),
                r.charge_type,
                r.amount if r.amount is not None else "",
                r.currency,
                (r.description or "").replace("\n", " ")[:500],
                r.record_status,
                r.payment_doc_id or "",
                r.payment_recurring_id or "",
                created,
                closed,
                r.created_by_admin_id or "",
            ]
        )
    return ("\ufeff" + out.getvalue()).encode("utf-8")


def build_executive_pdf(
    db: Session,
    *,
    period_label: str,
    start_dt: datetime | None,
    end_dt: datetime | None,
) -> bytes:
    users_total = db.query(func.count(User.id)).scalar() or 0
    admins_total = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
    accounts_total = db.query(func.count(Account.id)).scalar() or 0
    campaigns_total = db.query(func.count(TrackedCampaign.id)).scalar() or 0
    meta_connected = get_global_meta_integration(db) is not None

    hist_q = db.query(BillingInstructionHistory)
    if start_dt:
        hist_q = hist_q.filter(BillingInstructionHistory.created_at >= start_dt)
    if end_dt:
        hist_q = hist_q.filter(BillingInstructionHistory.created_at < end_dt)
    hist_rows = hist_q.all()

    by_charge: dict[str, int] = defaultdict(int)
    by_status: dict[str, int] = defaultdict(int)
    amt_by_cur: dict[str, float] = defaultdict(float)
    for r in hist_rows:
        by_charge[r.charge_type or ""] += 1
        by_status[r.record_status or ""] += 1
        if r.amount is not None:
            amt_by_cur[(r.currency or "ILS").upper()] += float(r.amount)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    story: list = []

    story.append(Paragraph("Executive summary", styles["Title"]))
    story.append(Paragraph(f"Generated: {_utc_now_str()}", styles["Normal"]))
    story.append(Paragraph(f"Reporting period: {period_label}", styles["Normal"]))
    story.append(Spacer(1, 0.6 * cm))

    story.append(Paragraph("Platform overview", styles["Heading2"]))
    plat_data = [
        ["Metric", "Value"],
        ["Users (total)", str(users_total)],
        ["Admins", str(admins_total)],
        ["Regular users", str(int(users_total) - int(admins_total))],
        ["Business accounts", str(accounts_total)],
        ["Tracked Meta campaigns", str(campaigns_total)],
        ["Meta integration connected", "Yes" if meta_connected else "No"],
    ]
    t1 = Table(plat_data, colWidths=[8 * cm, 8 * cm])
    t1.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(t1)
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("Billing activity (admin-created charges, DB snapshot)", styles["Heading2"]))
    story.append(Paragraph(f"Rows in period: {len(hist_rows)}", styles["Normal"]))
    story.append(Spacer(1, 0.2 * cm))

    if by_charge:
        c_rows = [["Charge type", "Count"]] + [[k, str(v)] for k, v in sorted(by_charge.items())]
        t2 = Table(c_rows, colWidths=[8 * cm, 4 * cm])
        t2.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0"))]))
        story.append(t2)
        story.append(Spacer(1, 0.3 * cm))

    if by_status:
        s_rows = [["Record status", "Count"]] + [[k, str(v)] for k, v in sorted(by_status.items())]
        t3 = Table(s_rows, colWidths=[8 * cm, 4 * cm])
        t3.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0"))]))
        story.append(t3)
        story.append(Spacer(1, 0.3 * cm))

    if amt_by_cur:
        a_rows = [["Currency", "Sum of instruction amounts (major units)"]] + [
            [c, f"{v:.2f}"] for c, v in sorted(amt_by_cur.items())
        ]
        t4 = Table(a_rows, colWidths=[4 * cm, 10 * cm])
        t4.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0"))]))
        story.append(t4)

    story.append(Spacer(1, 0.8 * cm))
    story.append(
        Paragraph(
            "Note: Paid vs unpaid Z-Credit status is not queried in this PDF for performance. "
            "Use the admin dashboard for live payment charts.",
            styles["Italic"],
        )
    )

    doc.build(story)
    return buffer.getvalue()

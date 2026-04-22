"""
Mock payment page — available only when Z-Credit is NOT configured.

Simulates the hosted payment flow for local development:
  GET  /api/mock-payment/{doc_id}        — renders a simple HTML payment page
  POST /api/mock-payment/{doc_id}/confirm — marks the invoice as paid in DB
"""

from __future__ import annotations

import logging
from typing import NamedTuple

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.db.session import get_db
from app.models.billing_instruction import AccountBillingInstruction
from app.models.billing_instruction_history import BillingInstructionHistory

logger = logging.getLogger(__name__)

router = APIRouter()


def _require_mock_mode() -> None:
    configured = bool(
        (settings.zcredit_terminal_number or "").strip()
        and (settings.zcredit_api_key or "").strip()
    )
    if configured:
        raise HTTPException(status_code=404, detail="not_found")


class _PaymentData(NamedTuple):
    amount: float | None
    currency: str
    description: str
    account_id: int
    doc_id: str


def _find_payment_data(db: Session, doc_id: str) -> _PaymentData | None:
    """Locate payment display data by doc_id in live instruction or history."""
    if doc_id.startswith("ins_"):
        try:
            ins_id = int(doc_id[4:])
        except ValueError:
            return None
        ins = db.query(AccountBillingInstruction).filter_by(id=ins_id).first()
        if ins:
            return _PaymentData(ins.amount, ins.currency or "ILS", ins.description or "Invoice", ins.account_id, doc_id)
        return None

    ins = (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.payment_doc_id == doc_id)
        .first()
    )
    if ins:
        return _PaymentData(ins.amount, ins.currency or "ILS", ins.description or "Invoice", ins.account_id, doc_id)

    # doc_id may belong to a superseded/history row (e.g. admin changed billing since the URL was generated)
    hist = (
        db.query(BillingInstructionHistory)
        .filter(BillingInstructionHistory.payment_doc_id == doc_id)
        .first()
    )
    if hist:
        return _PaymentData(
            float(hist.amount) if hist.amount else None,
            hist.currency or "ILS",
            hist.description or "Invoice",
            hist.account_id,
            doc_id,
        )

    return None


@router.get("/mock-payment/{doc_id}", response_class=HTMLResponse, include_in_schema=False)
def mock_payment_page(doc_id: str, db: Session = Depends(get_db)) -> HTMLResponse:
    _require_mock_mode()

    data = _find_payment_data(db, doc_id)
    if not data:
        raise HTTPException(status_code=404, detail="invoice_not_found")

    amount = f"{data.amount:.2f}" if data.amount else "—"
    currency = data.currency
    description = data.description
    confirm_url = f"/api/mock-payment/{doc_id}/confirm"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mock Payment — {description}</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f0f2f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }}
    .card {{
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,.08);
      padding: 40px 36px;
      max-width: 420px;
      width: 100%;
    }}
    .badge {{
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .06em;
      text-transform: uppercase;
      background: #fff7e6;
      color: #d46b08;
      border: 1px solid #ffd591;
      border-radius: 6px;
      padding: 3px 10px;
      margin-bottom: 20px;
    }}
    h1 {{ font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 6px; }}
    .desc {{ font-size: 13px; color: #64748b; margin-bottom: 28px; line-height: 1.55; }}
    .amount-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      margin-bottom: 28px;
    }}
    .amount-label {{ font-size: 13px; color: #64748b; }}
    .amount-value {{ font-size: 20px; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }}
    .btn {{
      width: 100%;
      padding: 13px;
      border-radius: 8px;
      border: none;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity .15s;
    }}
    .btn:hover {{ opacity: .88; }}
    .btn-pay {{ background: #1677ff; color: #fff; margin-bottom: 10px; }}
    .btn-fail {{ background: #fff; color: #cf1322; border: 1px solid #ffa39e; }}
    .note {{
      margin-top: 20px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.5;
    }}
    .result {{
      display: none;
      margin-top: 20px;
      padding: 14px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
    }}
    .result.ok  {{ background: #f6ffed; color: #389e0d; border: 1px solid #b7eb8f; }}
    .result.err {{ background: #fff2f0; color: #cf1322; border: 1px solid #ffa39e; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">DEV — Mock Payment</div>
    <h1>{description}</h1>
    <p class="desc">This is a simulated payment page. No real money is charged.</p>

    <div class="amount-row">
      <span class="amount-label">Total due</span>
      <span class="amount-value">{amount} {currency}</span>
    </div>

    <button class="btn btn-pay" onclick="pay(true)">Simulate Successful Payment</button>
    <button class="btn btn-fail" onclick="pay(false)">Simulate Failed Payment</button>

    <div class="result" id="result"></div>
    <p class="note">Mock mode is active because ZCREDIT_TERMINAL_NUMBER / ZCREDIT_API_KEY are not set.</p>
  </div>

  <script>
    async function pay(success) {{
      const btns = document.querySelectorAll('.btn');
      btns.forEach(b => b.disabled = true);
      const res = document.getElementById('result');
      try {{
        const r = await fetch('{confirm_url}', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ success }}),
        }});
        const data = await r.json();
        if (r.ok && data.ok) {{
          res.className = 'result ok';
          res.textContent = success
            ? '✓ Payment confirmed. You can close this tab and refresh the billing page.'
            : '✗ Payment marked as failed (mock).';
          res.style.display = 'block';
        }} else {{
          throw new Error(data.detail || 'Unknown error');
        }}
      }} catch (e) {{
        res.className = 'result err';
        res.textContent = 'Error: ' + e.message;
        res.style.display = 'block';
        btns.forEach(b => b.disabled = false);
      }}
    }}
  </script>
</body>
</html>"""
    return HTMLResponse(content=html)


@router.post("/mock-payment/{doc_id}/confirm", include_in_schema=False)
def mock_payment_confirm(
    doc_id: str,
    payload: dict,
    db: Session = Depends(get_db),
) -> JSONResponse:
    _require_mock_mode()

    data = _find_payment_data(db, doc_id)
    if not data:
        raise HTTPException(status_code=404, detail="invoice_not_found")

    ins = db.query(AccountBillingInstruction).filter_by(account_id=data.account_id).first()
    if not ins:
        raise HTTPException(status_code=404, detail="invoice_not_found")

    success: bool = bool(payload.get("success", True))

    if success:
        # Only clear payment_url when this doc_id is still the active one;
        # superseded doc_ids should not overwrite the live instruction's state.
        if ins.payment_doc_id == doc_id:
            ins.payment_url = None
        if ins.charge_type == "monthly":
            ins.subscription_status = "active"
        logger.info("mock_payment: confirmed doc_id=%s account_id=%s", doc_id, ins.account_id)
    else:
        if ins.charge_type == "monthly":
            ins.subscription_status = "past_due"
        logger.info("mock_payment: failed doc_id=%s account_id=%s", doc_id, ins.account_id)

    db.add(ins)
    db.commit()

    return JSONResponse({"ok": True, "success": success})

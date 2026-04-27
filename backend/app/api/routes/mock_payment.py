"""
Mock payment page — available only when Z-Credit is NOT configured.

Simulates the hosted payment flow for local development:
  GET  /api/mock-payment/{doc_id}        — renders a payment page styled like the checkout UI
  POST /api/mock-payment/{doc_id}/confirm — marks the invoice as paid in DB
"""

from __future__ import annotations

import json
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
    line_items_json: str | None = None
    charge_type: str = "one_time"


def _find_payment_data(db: Session, doc_id: str) -> _PaymentData | None:
    """Locate payment display data by doc_id in live instruction or history."""
    if doc_id.startswith("ins_"):
        try:
            ins_id = int(doc_id[4:])
        except ValueError:
            return None
        ins = db.query(AccountBillingInstruction).filter_by(id=ins_id).first()
        if ins:
            return _PaymentData(ins.amount, ins.currency or "ILS", ins.description or "Invoice", ins.account_id, doc_id, ins.line_items_json, ins.charge_type or "one_time")
        return None

    ins = (
        db.query(AccountBillingInstruction)
        .filter(AccountBillingInstruction.payment_doc_id == doc_id)
        .first()
    )
    if ins:
        return _PaymentData(ins.amount, ins.currency or "ILS", ins.description or "Invoice", ins.account_id, doc_id, ins.line_items_json, ins.charge_type or "one_time")

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
            hist.line_items_json,
            getattr(hist, "charge_type", None) or "one_time",
        )

    return None


@router.get("/mock-payment/{doc_id}", response_class=HTMLResponse, include_in_schema=False)
def mock_payment_page(doc_id: str, db: Session = Depends(get_db)) -> HTMLResponse:
    _require_mock_mode()

    data = _find_payment_data(db, doc_id)
    if not data:
        raise HTTPException(status_code=404, detail="invoice_not_found")

    amount_val = data.amount or 0.0
    currency = data.currency
    description = data.description
    charge_sub = "חודשי" if data.charge_type == "monthly" else "חד-פעמי"
    confirm_url = f"/api/mock-payment/{doc_id}/confirm"

    try:
        amount_fmt = f"{amount_val:,.2f} {currency}"
    except Exception:
        amount_fmt = f"{amount_val} {currency}"

    line_items: list[dict] = []
    if data.line_items_json:
        try:
            parsed = json.loads(data.line_items_json)
            if isinstance(parsed, list):
                line_items = parsed
        except Exception:
            pass

    if line_items:
        rows_html = ""
        for i, li in enumerate(line_items):
            label = str(li.get("label") or li.get("code") or "—")
            code = str(li.get("code") or "")
            li_amt = li.get("amount", 0)
            try:
                li_fmt = f"{float(li_amt):,.2f} {currency}"
            except Exception:
                li_fmt = f"{li_amt} {currency}"
            code_span = f'<span class="lc">({code})</span>' if code else ""
            sep = ' style="border-top:1px solid rgba(15,23,42,.05)"' if i > 0 else ""
            rows_html += f'<div class="li"{sep}><span class="ll">{label}{code_span}</span><span class="la">{li_fmt}</span></div>'
        lines_html = f"""<div class="lcard">
            <div class="lhdr">פריטים</div>
            {rows_html}
            <hr class="ldiv"/>
            <div class="lt"><span class="ltl">סה"כ לתשלום</span><span class="lta">{amount_fmt}</span></div>
          </div>"""
    else:
        lines_html = ""

    summary_section = f"""<div class="smry">
      <span class="sh">חשבונית</span>
      <span class="st">{description}</span>
      <span class="ss">{charge_sub}</span>
      {lines_html}
    </div>"""

    html = f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>{description}</title>
  <style>
    *,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#fafafa;min-height:100vh;display:flex;flex-direction:column}}
    .topbar{{padding:16px 24px;border-bottom:1px solid rgba(15,23,42,.07);background:#fff;display:flex;align-items:center}}
    .slbl{{display:flex;align-items:center;gap:6px;font-size:13px;color:#64748b}}
    .lico{{width:13px;height:13px;fill:currentColor;flex-shrink:0}}
    .main{{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:48px 24px 64px}}
    .inner{{width:100%;max-width:880px;display:flex;gap:32px;flex-wrap:wrap}}
    .smry{{flex:1 1 320px;min-width:0}}
    .sh{{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;display:block;margin-bottom:16px}}
    .st{{font-size:24px;font-weight:700;letter-spacing:-.02em;color:#0f172a;display:block;margin-bottom:6px}}
    .ss{{font-size:13px;color:#64748b;display:block}}
    .lcard{{margin-top:28px;border-radius:10px;border:1px solid rgba(15,23,42,.08);background:#fff;overflow:hidden}}
    .lhdr{{padding:10px 16px 8px;font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8;border-bottom:1px solid rgba(15,23,42,.06)}}
    .li{{display:flex;justify-content:space-between;align-items:center;padding:12px 16px}}
    .ll{{font-size:14px;color:#0f172a}}
    .lc{{margin-inline-start:6px;font-size:12px;color:#64748b}}
    .la{{font-size:14px;font-weight:500;font-variant-numeric:tabular-nums;color:#0f172a}}
    .ldiv{{border:none;border-top:1px solid rgba(0,0,0,.06);margin:0}}
    .lt{{display:flex;justify-content:space-between;align-items:center;padding:14px 16px}}
    .ltl{{font-size:14px;font-weight:600;color:#0f172a}}
    .lta{{font-size:18px;font-weight:600;letter-spacing:-.01em;color:#0f172a}}
    .panel{{flex:0 0 340px;min-width:300px;background:#fff;border-radius:14px;border:1px solid rgba(15,23,42,.09);box-shadow:0 2px 12px rgba(15,23,42,.06);padding:28px 28px 24px;display:flex;flex-direction:column;gap:20px}}
    .albl{{font-size:12px;color:#64748b;display:block;margin-bottom:4px}}
    .aval{{font-size:32px;font-weight:700;letter-spacing:-.03em;color:#0f172a;display:block}}
    .dvdr{{border:none;border-top:1px solid rgba(0,0,0,.06);margin:0}}
    .mthd{{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:8px;background:#f8fafc;border:1px solid rgba(15,23,42,.07)}}
    .mico{{width:18px;height:18px;fill:#64748b;flex-shrink:0}}
    .mt{{font-size:13px;font-weight:600;display:block;color:#0f172a}}
    .ms{{font-size:12px;color:#64748b;display:block}}
    .consent{{display:flex;align-items:flex-start;gap:8px}}
    .consent input{{margin-top:3px;width:16px;height:16px;flex-shrink:0;cursor:pointer;accent-color:#1677ff}}
    .consent label{{font-size:13px;line-height:1.55;color:#475569;cursor:pointer}}
    .consent a{{color:#1677ff;text-decoration:none}}
    .pbtn{{width:100%;height:48px;border-radius:10px;border:none;background:#1677ff;color:#fff;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity .15s;font-family:inherit}}
    .pbtn:disabled{{opacity:.45;cursor:not-allowed}}
    .pbtn:not(:disabled):hover{{opacity:.88}}
    .snote{{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:#64748b}}
    .cico{{width:13px;height:13px;fill:#22c55e;flex-shrink:0}}
    .sucwrap{{display:none;flex:1;align-items:center;justify-content:center;padding:48px 24px}}
    .succard{{flex-direction:column;align-items:center;text-align:center;padding:48px 40px;background:#fff;border-radius:16px;border:1px solid rgba(15,23,42,.09);box-shadow:0 2px 12px rgba(15,23,42,.06);max-width:440px;width:100%;display:flex}}
    .sucico{{font-size:52px;color:#22c55e;margin-bottom:16px;line-height:1}}
    .sucttl{{font-size:20px;font-weight:700;color:#0f172a;margin-bottom:8px}}
    .sucdsc{{font-size:14px;color:#64748b;line-height:1.6}}
  </style>
</head>
<body>
  <div class="topbar">
    <span class="slbl">
      <svg class="lico" viewBox="64 64 896 896"><path d="M832 464h-68V240c0-70.7-57.3-128-128-128H388c-70.7 0-128 57.3-128 128v224h-68c-17.7 0-32 14.3-32 32v384c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V496c0-17.7-14.3-32-32-32zM540 701v67c0 4.4-3.6 8-8 8h-40c-4.4 0-8-3.6-8-8v-67a48.01 48.01 0 1 1 56 0zm152-237H332V240c0-30.9 25.1-56 56-56h248c30.9 0 56 25.1 56 56v224z"/></svg>
      שלום מאובטח
    </span>
  </div>
  <div class="main" id="main">
    <div class="inner">
      {summary_section}
      <div class="panel">
        <div>
          <span class="albl">סה"כ לתשלום</span>
          <span class="aval">{amount_fmt}</span>
        </div>
        <hr class="dvdr"/>
        <div class="mthd">
          <svg class="mico" viewBox="64 64 896 896"><path d="M880 168H144c-17.7 0-32 14.3-32 32v656c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V200c0-17.7-14.3-32-32-32zm-40 656H184V240h656v584zm-94-232c0 17.7-14.3 32-32 32H624c-17.7 0-32-14.3-32-32v-80c0-17.7 14.3-32 32-32h90c17.7 0 32 14.3 32 32v80z"/></svg>
          <div>
            <span class="mt">לתשלום</span>
            <span class="ms">פותח עמוד תשלום מאובטח</span>
          </div>
        </div>
        <div class="consent">
          <input type="checkbox" id="agree" onchange="document.getElementById('payBtn').disabled=!this.checked"/>
          <label for="agree">אני מאשר/ת את הסכום המוצג ומסכים/ה להפנייה לעמוד תשלום מאובטח להשלמת העסקה. <a href="#">מדיניות ביטולים</a> ו <a href="#">מדיניות פרטיות</a>.</label>
        </div>
        <button class="pbtn" id="payBtn" disabled onclick="doPay()">
          <svg style="width:15px;height:15px;fill:currentColor" viewBox="64 64 896 896"><path d="M880 168H144c-17.7 0-32 14.3-32 32v656c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V200c0-17.7-14.3-32-32-32zm-40 656H184V240h656v584zm-94-232c0 17.7-14.3 32-32 32H624c-17.7 0-32-14.3-32-32v-80c0-17.7 14.3-32 32-32h90c17.7 0 32 14.3 32 32v80z"/></svg>
          לתשלום
        </button>
        <div class="snote">
          <svg class="cico" viewBox="64 64 896 896"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 0 1-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z"/></svg>
          <span>תועברו לעמוד תשלום מאובטח.</span>
        </div>
      </div>
    </div>
  </div>
  <div class="sucwrap" id="successWrap">
    <div class="succard">
      <div class="sucico">&#10003;</div>
      <div class="sucttl">התשלום אושר!</div>
      <div class="sucdsc">התשלום עובד בהצלחה. ניתן לסגור את הדף.</div>
    </div>
  </div>
  <script>
    async function doPay(){{
      const btn=document.getElementById('payBtn');
      btn.disabled=true;
      btn.textContent='מעבד...';
      try{{
        const r=await fetch('{confirm_url}',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{success:true}})}});
        const d=await r.json();
        if(r.ok&&d.ok){{
          document.getElementById('main').style.display='none';
          document.getElementById('successWrap').style.display='flex';
        }}else throw new Error(d.detail||'שגיאה');
      }}catch(e){{
        btn.disabled=false;
        btn.textContent='לתשלום';
        alert('שגיאה: '+e.message);
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

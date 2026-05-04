"""Build signed contract PDF: overlay name / role / signature on Hebrew approval block when possible, else append page."""

from __future__ import annotations

import base64
import logging
import os
from datetime import datetime
from io import BytesIO

import fitz

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

logger = logging.getLogger(__name__)

# Typical Israeli quote / contract approval row (searchable text in exported PDFs)
_ANCHOR_ORDERER_NAME = "שם המזמין"
_ANCHOR_ORDERER_ROLE = "תפקיד המזמין"
_ANCHOR_SIGNATURE = "חתימה"
_ANCHOR_SUPPLIER_NAME = "שם הספק"
_ROW_BAND_PT = 52.0
_FIELD_WIDTH_PT = 230.0
_SIG_IMG_W_PT = 175.0
_SIG_IMG_H_PT = 50.0

_BIDI_CHARS = frozenset(
    "\u200f\u200e\u202a\u202b\u202c\ufeff\u200c\u200d"  # RLM, LRM, embed/pop, BOM, ZWJ/NJ
)


def _minimal_pdf_bytes(title: str, body: str) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    y = h - 48
    c.setFont("Helvetica-Bold", 14)
    for chunk in [title[i : i + 80] for i in range(0, min(len(title), 400), 80)] or ["Contract"]:
        c.drawString(48, y, chunk)
        y -= 18
    y -= 12
    c.setFont("Helvetica", 10)
    for line in (body or "").split("\n")[:120]:
        if y < 72:
            c.showPage()
            y = h - 48
        c.drawString(48, y, (line[:120] if line else " "))
        y -= 13
    c.save()
    return buf.getvalue()


def _normalize_vis(s: str) -> str:
    out = "".join(ch for ch in s if ch not in _BIDI_CHARS)
    return " ".join(out.split())


def _resolve_text_fontfile() -> str | None:
    """TTF with Hebrew coverage (Arial/DejaVu). Override with CONTRACT_PDF_FONT."""
    override = os.environ.get("CONTRACT_PDF_FONT") or os.environ.get("CONTRACT_PDF_HEBREW_FONT")
    if override and os.path.isfile(override):
        return override
    candidates = (
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\david.ttf",
        r"C:\Windows\Fonts\seguiui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    )
    for path in candidates:
        if path and os.path.isfile(path):
            return path
    return None


def _rect_value_left_of_label(label: fitz.Rect, width_pt: float) -> fitz.Rect:
    """Blank line often sits to the visual 'east' of a RTL label → lower x in PDF."""
    x1 = float(label.x0) - 5.0
    x0 = max(18.0, x1 - width_pt)
    y0 = max(14.0, float(label.y0) - 4.0)
    y1 = float(label.y1) + 10.0
    return fitz.Rect(x0, y0, x1, y1)


def _rect_value_right_of_label(label: fitz.Rect, width_pt: float, page_rect: fitz.Rect) -> fitz.Rect:
    """Labels on the left column (e.g. חתימה) often have the line to the right → higher x."""
    x0 = float(label.x1) + 6.0
    x1 = min(float(page_rect.width) - 18.0, x0 + width_pt)
    if x1 - x0 < 48.0:
        x1 = float(page_rect.width) - 18.0
        x0 = max(18.0, x1 - width_pt)
    y0 = max(14.0, float(label.y0) - 3.0)
    y1 = float(label.y1) + 10.0
    return fitz.Rect(x0, y0, x1, y1)


def _rect_value_below_label(label: fitz.Rect, width_pt: float, page_rect: fitz.Rect) -> fitz.Rect:
    """Some templates draw the rule under the words; fill just under the label bbox."""
    y0 = float(label.y1) + 5.0
    y1 = y0 + 20.0
    x1 = min(float(page_rect.width) - 18.0, float(label.x1) + 50.0)
    x0 = max(18.0, x1 - width_pt)
    return fitz.Rect(x0, y0, x1, y1)


def _rect_signature_left_of_label(label: fitz.Rect) -> fitz.Rect:
    x1 = float(label.x0) - 5.0
    x0 = max(18.0, x1 - _SIG_IMG_W_PT)
    y0 = max(14.0, float(label.y0) - 5.0)
    y1 = y0 + _SIG_IMG_H_PT
    return fitz.Rect(x0, y0, x1, y1)


def _rect_signature_right_of_label(label: fitz.Rect, page_rect: fitz.Rect) -> fitz.Rect:
    x0 = float(label.x1) + 6.0
    x1 = min(float(page_rect.width) - 18.0, x0 + _SIG_IMG_W_PT)
    if x1 - x0 < 36.0:
        x1 = float(page_rect.width) - 18.0
        x0 = max(18.0, x1 - _SIG_IMG_W_PT)
    y0 = max(14.0, float(label.y0) - 4.0)
    y1 = y0 + _SIG_IMG_H_PT
    return fitz.Rect(x0, y0, x1, y1)


def _rect_signature_below_label(label: fitz.Rect, page_rect: fitz.Rect) -> fitz.Rect:
    y0 = float(label.y1) + 4.0
    y1 = y0 + _SIG_IMG_H_PT
    x1 = min(float(page_rect.width) - 18.0, float(label.x1) + 40.0)
    x0 = max(18.0, x1 - _SIG_IMG_W_PT)
    return fitz.Rect(x0, y0, x1, y1)


def _value_rect_candidates(page_rect: fitz.Rect, label: fitz.Rect, width_pt: float) -> list[fitz.Rect]:
    pw = float(page_rect.width)
    mid = 0.5 * (float(label.x0) + float(label.x1))
    left_r = _rect_value_left_of_label(label, width_pt)
    right_r = _rect_value_right_of_label(label, width_pt, page_rect)
    below_r = _rect_value_below_label(label, width_pt, page_rect)
    if mid < pw * 0.36:
        return [right_r, left_r, below_r]
    if mid > pw * 0.64:
        return [left_r, right_r, below_r]
    return [left_r, right_r, below_r]


def _signature_rect_candidates(page_rect: fitz.Rect, label: fitz.Rect) -> list[fitz.Rect]:
    pw = float(page_rect.width)
    mid = 0.5 * (float(label.x0) + float(label.x1))
    left_r = _rect_signature_left_of_label(label)
    right_r = _rect_signature_right_of_label(label, page_rect)
    below_r = _rect_signature_below_label(label, page_rect)
    if mid < pw * 0.36:
        return [right_r, left_r, below_r]
    if mid > pw * 0.64:
        return [left_r, right_r, below_r]
    return [left_r, right_r, below_r]


def _insert_rtl_text(
    page: fitz.Page,
    page_rect: fitz.Rect,
    label_rect: fitz.Rect,
    text: str,
    fontfile: str | None,
    width_pt: float = _FIELD_WIDTH_PT,
) -> None:
    stripped = (text or "").strip()
    if not stripped:
        return
    common = dict(fontsize=11.0, color=(0, 0, 0), align=fitz.TEXT_ALIGN_RIGHT)
    for i, rect in enumerate(_value_rect_candidates(page_rect, label_rect, width_pt)):
        if fontfile:
            leftover = page.insert_textbox(rect, stripped, fontfile=fontfile, **common)
        else:
            leftover = page.insert_textbox(rect, stripped, fontname="helv", **common)
        if leftover >= 0:
            return
        logger.debug("PDF overlay: text candidate %s underflow for rect=%s", i, rect)
    logger.warning("PDF overlay: could not fit name/role text in any candidate rect near label")


def _line_rects_containing(page: fitz.Page, needle: str) -> list[fitz.Rect]:
    """When search_for misses (split spans / invisible chars), match full logical lines."""
    nd = _normalize_vis(needle)
    if not nd:
        return []
    out: list[fitz.Rect] = []
    try:
        d = page.get_text("dict", flags=fitz.TEXTFLAGS_TEXT)
    except Exception:
        d = page.get_text("dict")
    for block in d.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            spans = line.get("spans", [])
            if not spans:
                continue
            combined = _normalize_vis("".join(s.get("text", "") for s in spans))
            if nd in combined or f"{nd}:" in combined:
                bb: fitz.Rect | None = None
                for s in spans:
                    r = fitz.Rect(s["bbox"])
                    bb = r if bb is None else (bb | r)
                if bb is not None:
                    out.append(bb)
    return out


def _merge_rect_hits(page: fitz.Page, needle: str) -> list[fitz.Rect]:
    hits: list[fitz.Rect] = []
    seen: set[tuple[float, float, float, float]] = set()

    def add(rects: list[fitz.Rect]) -> None:
        for r in rects:
            t = (round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2))
            if t not in seen:
                seen.add(t)
                hits.append(r)

    add(list(page.search_for(needle)))
    if not hits:
        add(list(page.search_for(needle + ":")))
    if not hits:
        add(_line_rects_containing(page, needle))
    return hits


def _pick_orderer_signature_label(
    page: fitz.Page,
    name_hit: fitz.Rect,
    supplier_top_y: float | None,
) -> fitz.Rect | None:
    all_sig = _merge_rect_hits(page, _ANCHOR_SIGNATURE)
    if not all_sig:
        return None

    row_y = float(name_hit.y0)
    same_row = [r for r in all_sig if abs(float(r.y0) - row_y) < _ROW_BAND_PT]
    pool = same_row if same_row else list(all_sig)

    if supplier_top_y is not None:
        pool = [r for r in pool if float(r.y0) < supplier_top_y - 3.0]
        if not pool:
            pool = [r for r in all_sig if float(r.y0) < supplier_top_y - 3.0]

    if not pool:
        return None

    if len(pool) == 1:
        return pool[0]

    # Same row: RTL form — signature column is often the left-most label (smallest x0).
    if same_row:
        return min(pool, key=lambda r: float(r.x0))

    # Two rows: orderer חתימה is above supplier — smaller y0.
    return min(pool, key=lambda r: float(r.y0))


def _overlay_orderer_row_on_page(
    page: fitz.Page,
    signer_name: str,
    signer_position: str,
    signature_png: bytes,
) -> bool:
    """
    If the page contains Hebrew orderer approval labels, draw name, role, and signature image
    in the blank lines next to each label (left / right / below depending on column — typical RTL forms).
    Returns True if the signature image was placed on this page.
    """
    name_hits = _merge_rect_hits(page, _ANCHOR_ORDERER_NAME)
    if not name_hits:
        return False

    # Lowest on page = footer approval block (avoid rare duplicates higher on page).
    name_hit = max(name_hits, key=lambda r: float(r.y0))
    row_y = float(name_hit.y0)

    supplier_hits = _merge_rect_hits(page, _ANCHOR_SUPPLIER_NAME)
    supplier_top_y = min((float(r.y0) for r in supplier_hits), default=None)

    fontfile = _resolve_text_fontfile()
    if not fontfile:
        logger.warning(
            "No TTF font for PDF overlay (set CONTRACT_PDF_FONT); Hebrew name/role may not render."
        )

    role_hits_all = _merge_rect_hits(page, _ANCHOR_ORDERER_ROLE)
    role_hits = [r for r in role_hits_all if abs(float(r.y0) - row_y) < _ROW_BAND_PT]
    role_hit = role_hits[0] if role_hits else (role_hits_all[0] if role_hits_all else None)

    sig_label = _pick_orderer_signature_label(page, name_hit, supplier_top_y)
    if sig_label is None:
        logger.info("PDF overlay: found orderer name anchor but no matching חתימה label")
        return False

    page_rect = page.rect
    try:
        _insert_rtl_text(page, page_rect, name_hit, signer_name, fontfile)
        if role_hit:
            _insert_rtl_text(page, page_rect, role_hit, signer_position, fontfile)
        placed_img = False
        for sig_rect in _signature_rect_candidates(page_rect, sig_label):
            try:
                page.insert_image(sig_rect, stream=signature_png)
                placed_img = True
                break
            except Exception:
                continue
        if not placed_img:
            return False
    except Exception:
        logger.exception("Hebrew template overlay failed")
        return False
    return True


def _append_signature_page(
    doc: fitz.Document,
    signature_png: bytes,
    signer_name: str,
    signed_at: datetime,
) -> None:
    ref = doc[-1].rect
    page = doc.new_page(-1, width=ref.width, height=ref.height)
    rw, rh = float(page.rect.width), float(page.rect.height)
    margin_x = 48.0
    margin_bottom = 56.0
    img_max_w = min(280.0, rw - 2 * margin_x)
    img_h = 96.0
    img_x = (rw - img_max_w) / 2
    img_y = rh - margin_bottom - img_h - 36.0
    rect = fitz.Rect(img_x, img_y, img_x + img_max_w, img_y + img_h)
    try:
        page.insert_image(rect, stream=signature_png)
    except Exception as e:
        logger.exception("insert_image failed: %s", e)
        raise ValueError("invalid_signature_image") from e

    cap1 = f"Signed by: {signer_name.strip()}"
    cap2 = signed_at.strftime("%Y-%m-%d %H:%M UTC")
    page.insert_text((margin_x, 52), "Electronic signature", fontsize=14, color=(0, 0, 0))
    page.insert_text((margin_x, img_y - 26), cap1, fontsize=11, color=(0, 0, 0))
    page.insert_text((margin_x, img_y - 10), cap2, fontsize=9, color=(0.25, 0.25, 0.25))


def build_signed_contract_pdf(
    pdf_base64: str | None,
    signature_png_b64: str,
    signer_name: str,
    signed_at: datetime,
    fallback_title: str,
    fallback_body: str,
    signer_position: str | None = None,
) -> bytes:
    """Return full PDF bytes: overlay on Hebrew approval row when anchors exist, else append signature page."""
    try:
        sig_raw = base64.b64decode(signature_png_b64, validate=True)
    except Exception:
        sig_raw = base64.b64decode(signature_png_b64)
    if not sig_raw:
        raise ValueError("empty_signature")

    if pdf_base64 and pdf_base64.strip():
        try:
            raw_pdf = base64.b64decode(pdf_base64.strip())
        except Exception as e:
            logger.warning("invalid stored pdf base64, falling back to text-only: %s", e)
            raw_pdf = _minimal_pdf_bytes(fallback_title, fallback_body)
    else:
        raw_pdf = _minimal_pdf_bytes(fallback_title, fallback_body)

    pos = (signer_position or "").strip()

    doc = fitz.open(stream=raw_pdf, filetype="pdf")
    try:
        if doc.page_count < 1:
            doc.close()
            doc = fitz.open(stream=_minimal_pdf_bytes(fallback_title, fallback_body), filetype="pdf")

        placed_on_form = False
        if doc.page_count >= 1:
            # Hebrew block may not be on the very last page; scan from end.
            for pi in range(doc.page_count - 1, -1, -1):
                page = doc.load_page(pi)
                if _overlay_orderer_row_on_page(page, signer_name, pos, sig_raw):
                    placed_on_form = True
                    logger.info("PDF overlay: placed signature on page %s", pi + 1)
                    break

        if not placed_on_form:
            logger.info(
                "PDF overlay: Hebrew anchors not found or not vector text — appending signature page "
                "(scanned %s page(s); if the PDF is a scan, use a text-based export).",
                doc.page_count,
            )
            _append_signature_page(doc, sig_raw, signer_name, signed_at)
        out = doc.tobytes()
    finally:
        doc.close()
    return out

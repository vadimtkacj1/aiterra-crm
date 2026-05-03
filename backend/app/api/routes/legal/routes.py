"""Static legal pages (Hebrew) — shared HTML for API, mock checkout links, and SPA iframe."""

from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse

from app.legal.documents import render_cancel_policy_html, render_privacy_policy_html

router = APIRouter()


@router.get("/cancel-policy", response_class=HTMLResponse, include_in_schema=False)
def cancel_policy_page(embed: bool = Query(False, description="Omit back link when embedded in SPA iframe")) -> HTMLResponse:
    return HTMLResponse(content=render_cancel_policy_html(embed=embed))


@router.get("/privacy-policy", response_class=HTMLResponse, include_in_schema=False)
def privacy_policy_page(embed: bool = Query(False, description="Omit back link when embedded in SPA iframe")) -> HTMLResponse:
    return HTMLResponse(content=render_privacy_policy_html(embed=embed))

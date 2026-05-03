"""Render full HTML policy pages from `fragments/*.html` (single source of truth)."""

from __future__ import annotations

from pathlib import Path

from app.legal.policy_css import POLICY_PAGE_CSS

_FRAG_DIR = Path(__file__).resolve().parent / "fragments"


def _fragment(filename: str) -> str:
    return (_FRAG_DIR / filename).read_text(encoding="utf-8")


def build_policy_document(*, title: str, fragment_file: str, embed: bool) -> str:
    """
    :param embed: When True (e.g. SPA iframe), omit the fixed «back» link — the host app provides navigation.
    """
    inner = _fragment(fragment_file)
    back = ""
    if not embed:
        back = """  <a class="back" href="/" onclick="if(window.history.length > 1){history.back(); return false;}">&#8594; חזרה</a>
"""
    return f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>{title}</title><style>{POLICY_PAGE_CSS}</style></head>
<body>
{back}  <main>
{inner}
  </main>
</body></html>"""


def render_cancel_policy_html(*, embed: bool = False) -> str:
    return build_policy_document(title="מדיניות ביטולים", fragment_file="cancel_policy.html", embed=embed)


def render_privacy_policy_html(*, embed: bool = False) -> str:
    return build_policy_document(title="מדיניות פרטיות", fragment_file="privacy_policy.html", embed=embed)

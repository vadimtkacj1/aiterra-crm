"""Shared CSS for standalone policy pages (Hebrew RTL)."""

POLICY_PAGE_CSS = """
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#fff;color:#111827;min-height:100vh}
    .back{position:fixed;top:20px;right:24px;z-index:100;display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:6px 14px;font-size:14px;font-weight:500;color:#374151;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.12);text-decoration:none}
    .back:hover{background:#f8fafc}
    main{max-width:900px;margin:0 auto;padding:40px 24px 56px;display:grid;gap:32px}
    h1{font-size:32px;font-weight:700;margin:0}
    h2{font-size:22px;font-weight:700;margin:0}
    p{margin:0;line-height:1.8;color:#374151}
    ul{margin:0;padding-right:20px;display:grid;gap:8px;color:#374151;line-height:1.8}
    section{display:grid;gap:10px}
    header{display:grid;gap:12px}
"""

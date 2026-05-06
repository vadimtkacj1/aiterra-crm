from __future__ import annotations

import json
import socket
import sys
from pathlib import Path


# ── helpers ───────────────────────────────────────────────────────────────────

def _c(code: str, text: str) -> str:
    return f"\033[{code}m{text}\033[0m"

def ok(msg: str)   -> None: print(f"  {_c('32', 'OK')}  {msg}")
def fail(msg: str) -> None: print(f"  {_c('31', 'FAIL')} {msg}")
def info(msg: str) -> None: print(f"  {_c('34', '--')}  {msg}")
def header(msg: str) -> None: print(f"\n{_c('1', msg)}")


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def tcp_check(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=5):
            return True
    except OSError:
        return False


def post_json(url: str, body: dict) -> dict:
    import urllib.request
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode(errors="replace")
        return {"_http_error": e.code, "_body": body_text}
    except Exception as e:
        return {"_exception": str(e)}


# ── checks ────────────────────────────────────────────────────────────────────

def run() -> bool:
    env = load_env()

    api_key        = env.get("ZCREDIT_API_KEY", "").strip()
    terminal       = env.get("ZCREDIT_TERMINAL_NUMBER", "").strip()
    password       = env.get("ZCREDIT_GATEWAY_PASSWORD", "").strip() or api_key
    wc_url         = env.get("ZCREDIT_API_URL", "https://pci.zcredit.co.il/webcheckout/api/WebCheckout").rstrip("/")
    gw_url         = env.get("ZCREDIT_GATEWAY_BASE_URL", "https://pci.zcredit.co.il/ZCreditWS/api").rstrip("/")

    all_ok = True

    # ── 1. Settings ──────────────────────────────────────────────────────────
    header("1. Settings")

    if api_key:
        ok(f"ZCREDIT_API_KEY      = {api_key[:8]}...{api_key[-4:]}")
    else:
        fail("ZCREDIT_API_KEY      not set")
        all_ok = False

    if terminal:
        ok(f"ZCREDIT_TERMINAL_NUMBER = {terminal}")
    else:
        fail("ZCREDIT_TERMINAL_NUMBER not set")
        all_ok = False

    if password:
        ok(f"password             = {password[:4]}... (ZCREDIT_GATEWAY_PASSWORD or API_KEY)")
    else:
        fail("password             not set")

    info(f"WebCheckout URL      = {wc_url}")
    info(f"Gateway URL          = {gw_url}")

    if not api_key or not terminal:
        fail("Missing required keys — cannot continue")
        return False

    # ── 2. TCP connectivity ──────────────────────────────────────────────────
    header("2. TCP connectivity")

    from urllib.parse import urlparse
    for url_label, url_val in [("WebCheckout", wc_url), ("Gateway", gw_url)]:
        parsed = urlparse(url_val)
        host = parsed.hostname or ""
        port = parsed.port or 443
        if tcp_check(host, port):
            ok(f"{url_label}: {host}:{port} reachable")
        else:
            fail(f"{url_label}: {host}:{port} UNREACHABLE")
            all_ok = False

    # ── 3. WebCheckout — CreateSession ───────────────────────────────────────
    header("3. WebCheckout API key (CreateSession with dummy data)")
    info("Sending minimal CreateSession request...")

    wc_body = {
        "Key": api_key,
        "Local": "He",
        "UniqueId": "check_zcredit_test_001",
        "SuccessUrl": "https://example.com/success",
        "CancelUrl": "https://example.com/cancel",
        "CallbackUrl": "https://example.com/callback",
        "FailureCallBackUrl": "https://example.com/callback",
        "FailureRedirectUrl": "https://example.com/cancel",
        "NumberOfFailures": 3,
        "PaymentType": "regular",
        "CreateInvoice": "false",
        "AdditionalText": "API key check",
        "ShowCart": "true",
        "CartItems": [
            {
                "Amount": "1.00",
                "Currency": "ILS",
                "Name": "Test",
                "Description": "API key check",
                "Quantity": 1,
                "Image": "",
                "IsTaxFree": "false",
                "AdjustAmount": "false",
            }
        ],
        "Installments": {"Type": "regular", "MinQuantity": "1", "MaxQuantity": "1"},
        "FocusType": "None",
        "UseLightMode": "false",
        "ShowTotalSumInPayButton": "true",
        "Bypass3DS": "false",
    }

    wc_resp = post_json(f"{wc_url}/CreateSession", wc_body)

    if "_exception" in wc_resp:
        fail(f"Request failed: {wc_resp['_exception']}")
        all_ok = False
    elif "_http_error" in wc_resp:
        fail(f"HTTP {wc_resp['_http_error']}: {wc_resp.get('_body', '')[:200]}")
        all_ok = False
    elif wc_resp.get("HasError"):
        inner = wc_resp.get("Data") or wc_resp
        msg = inner.get("ReturnMessage") or wc_resp.get("ReturnMessage") or json.dumps(wc_resp)[:200]
        fail(f"API key rejected: {msg}")
        all_ok = False
    else:
        inner = wc_resp.get("Data") or wc_resp
        rc = inner.get("ReturnCode", wc_resp.get("ReturnCode"))
        if rc not in (None, 0, "0"):
            fail(f"ReturnCode={rc}  msg={inner.get('ReturnMessage', '')}")
            all_ok = False
        else:
            session_id  = inner.get("SessionId", "")
            session_url = inner.get("SessionUrl", "")
            ok(f"API key VALID — SessionId={session_id}")
            if session_url:
                info(f"Payment URL: {session_url}")

    # ── 4. Gateway — GetTokenData ────────────────────────────────────────────
    header("4. Gateway terminal + password (GetTokenData with dummy token)")
    info("Sending GetTokenData with empty token...")

    gw_body = {
        "TerminalNumber": terminal,
        "Password": password,
        "Token": "0000000000000000",
    }

    gw_resp = post_json(f"{gw_url}/Token/GetTokenData", gw_body)

    if "_exception" in gw_resp:
        fail(f"Request failed: {gw_resp['_exception']}")
        all_ok = False
    elif "_http_error" in gw_resp:
        fail(f"HTTP {gw_resp['_http_error']}: {gw_resp.get('_body', '')[:200]}")
        all_ok = False
    else:
        rc  = gw_resp.get("ReturnCode")
        msg = str(gw_resp.get("ReturnMessage") or "")
        has_err = gw_resp.get("HasError", False)

        # Auth errors have specific codes / messages
        auth_fail = any(x in msg.lower() for x in ["password", "terminal", "unauthori", "auth", "invalid key"])

        if has_err and auth_fail:
            fail(f"Terminal/Password rejected: {msg}")
            all_ok = False
        elif has_err:
            # Token not found = expected, means auth passed
            ok(f"Terminal/Password VALID (token not found as expected: {msg})")
        else:
            ok(f"Gateway responded OK — ReturnCode={rc}")

    # ── result ───────────────────────────────────────────────────────────────
    print()
    if all_ok:
        print(_c("32", "All checks passed."))
    else:
        print(_c("31", "Some checks FAILED — see above."))

    return all_ok


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    success = run()
    sys.exit(0 if success else 1)

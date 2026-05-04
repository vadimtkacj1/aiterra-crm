"""
SMTP configuration checker.
Run from the backend directory:  python check_smtp.py [recipient@example.com]
"""

from __future__ import annotations

import smtplib
import socket
import ssl
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def load_settings() -> dict:
    """Load SMTP settings from .env without importing the full app."""
    import os
    from pathlib import Path

    env_file = Path(__file__).parent / ".env"
    cfg: dict[str, str] = {}
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            cfg[k.strip()] = v.strip()

    return {
        "host":     cfg.get("EMAIL_HOST") or cfg.get("SMTP_HOST") or "",
        "port":     int(cfg.get("EMAIL_PORT") or cfg.get("SMTP_PORT") or 587),
        "user":     cfg.get("EMAIL_USER") or cfg.get("SMTP_USER") or "",
        "password": cfg.get("EMAIL_PASSWORD") or cfg.get("SMTP_PASSWORD") or "",
        "from":     cfg.get("EMAIL_FROM") or cfg.get("SMTP_FROM") or "",
        "use_tls":  (cfg.get("EMAIL_USE_TLS") or cfg.get("SMTP_USE_TLS") or "true").lower() != "false",
        "use_ssl":  (cfg.get("EMAIL_USE_SSL") or cfg.get("SMTP_USE_SSL") or "false").lower() == "true",
    }


def ok(msg: str) -> None:
    print(f"  \033[32m✓\033[0m  {msg}")


def fail(msg: str) -> None:
    print(f"  \033[31m✗\033[0m  {msg}")


def info(msg: str) -> None:
    print(f"  \033[34m→\033[0m  {msg}")


def section(title: str) -> None:
    print(f"\n\033[1m{title}\033[0m")


def run(to_email: str | None = None) -> bool:
    cfg = load_settings()

    section("SMTP Settings")
    for key in ("host", "port", "user", "from", "use_tls", "use_ssl"):
        val = cfg[key]
        if key == "password":
            continue
        label = key.ljust(10)
        if val:
            ok(f"{label} = {val}")
        else:
            fail(f"{label} = (not set)")

    if cfg["password"]:
        ok(f"{'password'.ljust(10)} = {'*' * len(cfg['password'])}")
    else:
        fail(f"{'password'.ljust(10)} = (not set)")

    if not cfg["host"]:
        print("\n\033[31mAbort: SMTP_HOST / EMAIL_HOST is not configured.\033[0m")
        return False

    # ── 1. DNS / TCP reachability ─────────────────────────────────────────────
    section("1. TCP connection")
    try:
        addr = socket.getaddrinfo(cfg["host"], cfg["port"], proto=socket.IPPROTO_TCP)
        ip = addr[0][4][0]
        ok(f"DNS resolved {cfg['host']} → {ip}")
    except socket.gaierror as e:
        fail(f"DNS lookup failed: {e}")
        return False

    try:
        sock = socket.create_connection((cfg["host"], cfg["port"]), timeout=10)
        sock.close()
        ok(f"TCP port {cfg['port']} reachable")
    except OSError as e:
        fail(f"Cannot connect to {cfg['host']}:{cfg['port']} — {e}")
        return False

    # ── 2. SMTP handshake + auth ──────────────────────────────────────────────
    section("2. SMTP handshake & login")
    smtp: smtplib.SMTP | smtplib.SMTP_SSL | None = None
    try:
        if cfg["use_ssl"]:
            ctx = ssl.create_default_context()
            smtp = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=15, context=ctx)
            info(f"Using SMTP_SSL (port {cfg['port']})")
        else:
            smtp = smtplib.SMTP(cfg["host"], cfg["port"], timeout=15)
            code, banner = smtp.ehlo()
            ok(f"EHLO → {code} {banner.decode(errors='replace').splitlines()[0]}")

            if cfg["use_tls"]:
                ctx = ssl.create_default_context()
                smtp.starttls(context=ctx)
                smtp.ehlo()
                ok("STARTTLS negotiated")
            else:
                info("TLS disabled (plain connection)")

        if cfg["user"] and cfg["password"]:
            smtp.login(cfg["user"], cfg["password"])
            ok(f"Login succeeded as {cfg['user']}")
        else:
            info("No credentials — skipping login (relay mode?)")

    except smtplib.SMTPAuthenticationError as e:
        fail(f"Authentication failed: {e.smtp_code} {e.smtp_error.decode(errors='replace')}")
        if smtp:
            smtp.quit()
        return False
    except smtplib.SMTPException as e:
        fail(f"SMTP error: {e}")
        if smtp:
            try:
                smtp.quit()
            except Exception:
                pass
        return False
    except ssl.SSLError as e:
        fail(f"SSL error: {e}")
        return False

    # ── 3. Send test email (optional) ─────────────────────────────────────────
    if to_email and smtp:
        section(f"3. Send test email → {to_email}")
        mail_from = cfg["from"] or cfg["user"]
        msg = MIMEMultipart()
        msg["Subject"] = "✅ SMTP test — Aiterra CRM"
        msg["From"] = mail_from
        msg["To"] = to_email
        body = (
            "This is an automated test message from the Aiterra CRM SMTP checker.\n\n"
            f"Host:    {cfg['host']}:{cfg['port']}\n"
            f"User:    {cfg['user']}\n"
            f"TLS:     {'STARTTLS' if cfg['use_tls'] else 'SSL' if cfg['use_ssl'] else 'none'}\n"
        )
        msg.attach(MIMEText(body, "plain", "utf-8"))
        try:
            smtp.sendmail(mail_from, [to_email], msg.as_bytes())
            ok(f"Message sent — check {to_email}")
        except smtplib.SMTPException as e:
            fail(f"Send failed: {e}")
    elif smtp:
        section("3. Send test email")
        info("Pass a recipient address as argument to send a test message:")
        info("  python check_smtp.py your@email.com")

    if smtp:
        try:
            smtp.quit()
        except Exception:
            pass

    print()
    ok("All checks passed.")
    return True


if __name__ == "__main__":
    recipient = sys.argv[1] if len(sys.argv) > 1 else None
    success = run(recipient)
    sys.exit(0 if success else 1)

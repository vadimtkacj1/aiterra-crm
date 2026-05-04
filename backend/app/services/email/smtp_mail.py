"""Optional SMTP: send transactional email with PDF attachment."""

from __future__ import annotations

import logging
import smtplib
import ssl
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.settings import settings

logger = logging.getLogger(__name__)


def send_signed_contract_pdf(
    to_email: str,
    subject: str,
    body_text: str,
    pdf_bytes: bytes | None,
    attachment_filename: str,
) -> bool:
    """
    Send email, optionally with a PDF attachment. Returns True if sent, False on misconfiguration or failure.
    """
    mail_from = settings.smtp_from_effective
    if not settings.smtp_host or not mail_from:
        logger.info("SMTP not configured; skip email to %s", to_email)
        return False
    if not to_email or "@" not in to_email:
        return False

    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = mail_from
    msg["To"] = to_email
    msg.attach(MIMEText(body_text, "plain", "utf-8"))

    if pdf_bytes:
        part = MIMEApplication(pdf_bytes, _subtype="pdf")
        part.add_header("Content-Disposition", "attachment", filename=attachment_filename)
        msg.attach(part)

    if not settings.smtp_user or not settings.smtp_password:
        logger.warning("SMTP host set but EMAIL_USER / EMAIL_PASSWORD missing — cannot log in")
        return False

    ctx = ssl.create_default_context()
    lh = settings.smtp_local_hostname
    smtp_kw: dict = {"timeout": 30}
    if lh:
        smtp_kw["local_hostname"] = lh
    try:
        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(
                settings.smtp_host, settings.smtp_port, context=ctx, **smtp_kw
            ) as smtp:
                smtp.login(settings.smtp_user, settings.smtp_password)
                smtp.sendmail(mail_from, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, **smtp_kw) as smtp:
                smtp.ehlo()
                if settings.smtp_use_tls:
                    smtp.starttls(context=ctx)
                    smtp.ehlo()
                smtp.login(settings.smtp_user, settings.smtp_password)
                smtp.sendmail(mail_from, [to_email], msg.as_string())
        logger.info("Sent signed contract email to %s", to_email)
        return True
    except smtplib.SMTPAuthenticationError as e:
        logger.error(
            "SMTP authentication failed for user %s (535). Check: mailbox password in Namecheap "
            "(webmail login with same user/pass), EMAIL_USER = full address, "
            "quote EMAIL_PASSWORD in .env; try EMAIL_PORT=465, EMAIL_USE_SSL=true, EMAIL_USE_TLS=false; "
            "EMAIL_FROM empty so it matches login; set EMAIL_EHLO_HOSTNAME=yourdomain.com if the server "
            "rejects the PC hostname. Server said: %s",
            settings.smtp_user,
            getattr(e, "smtp_error", e),
        )
        return False
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        return False

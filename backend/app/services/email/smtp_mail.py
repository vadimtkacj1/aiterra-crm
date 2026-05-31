"""Optional SMTP: send transactional email with PDF attachment."""

from __future__ import annotations

import logging
import smtplib
import ssl
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.settings import settings

logger = logging.getLogger(__name__)


def send_simple_email(to_email: str, subject: str, body: str) -> bool:
    """Send a plain-text email. Returns True if sent."""
    mail_from = settings.smtp_from_effective
    if not settings.smtp_host or not mail_from:
        logger.info("SMTP not configured; skip email to %s", to_email)
        return False
    if not to_email or "@" not in to_email:
        return False
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning("SMTP credentials missing — cannot send email")
        return False

    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = mail_from
    msg["To"] = to_email
    msg.attach(MIMEText(body, "plain", "utf-8"))

    ctx = ssl.create_default_context()
    smtp_kw: dict = {"timeout": 30}
    if lh := settings.smtp_local_hostname:
        smtp_kw["local_hostname"] = lh
    try:
        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=ctx, **smtp_kw) as smtp:
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
        logger.info("Sent email '%s' to %s", subject, to_email)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        return False


def send_past_due_alert(
    admin_emails: list[str],
    account_id: int,
    amount: float,
    currency: str,
    contract_title: str | None,
    payment_number: int,
    reason: str = "",
) -> None:
    """Notify all admins that a subscription charge failed (past_due)."""
    if not admin_emails:
        logger.warning("past_due alert: no admin emails to notify for account_id=%s", account_id)
        return

    subject = f"⚠️ Subscription payment failed — Account #{account_id}"
    contract_line = f"Contract:       {contract_title}" if contract_title else ""
    reason_line = f"Reason:         {reason}" if reason else ""

    body = "\n".join(filter(None, [
        "A subscription charge failed and the subscription is now PAST DUE.",
        "",
        f"Account ID:     #{account_id}",
        contract_line,
        f"Amount:         {amount:.2f} {currency}",
        f"Payment #:      {payment_number}",
        reason_line,
        "",
        "Action required: contact the client to update their payment method.",
        "Admin panel: Subscription Status → Resume after card is updated.",
    ]))

    for email in admin_emails:
        send_simple_email(email, subject, body)


def send_signed_contract_pdf(
    to_email: str,
    subject: str,
    body_text: str,
    pdf_bytes: bytes | None,
    signature_png_bytes: bytes | None,
    attachment_filename: str,
) -> bool:
    """
    Send email with optional PDF and signature image attachments.
    Returns True if sent, False on misconfiguration or failure.
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

    if signature_png_bytes:
        img = MIMEImage(signature_png_bytes, _subtype="png")
        img.add_header("Content-Disposition", "attachment", filename="signature.png")
        msg.attach(img)

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
            "SMTP authentication failed for user %s (535). Check: correct mailbox password (Zoho: use app "
            "password if 2FA is on), EMAIL_USER = full address, quote EMAIL_PASSWORD in .env; "
            "try port 465 + EMAIL_USE_SSL=true + EMAIL_USE_TLS=false; From must match login; "
            "EMAIL_EHLO_HOSTNAME=yourdomain.com if needed. Server said: %s",
            settings.smtp_user,
            getattr(e, "smtp_error", e),
        )
        return False
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        return False

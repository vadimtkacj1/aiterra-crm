"""Thin Green API wrapper — sends a single WhatsApp message.

Logic extracted from aiterra-assistant GreenApiClient; no business logic here.
"""
from __future__ import annotations

import logging
import re

import requests

logger = logging.getLogger(__name__)

_TIMEOUT = 10


def _phone_to_chat_id(phone: str) -> str:
    """Convert +972501234567 → 972501234567@c.us"""
    digits = re.sub(r"[^\d]", "", phone)
    return f"{digits}@c.us"


def send_whatsapp_message(
    api_url: str,
    id_instance: str,
    api_token: str,
    phone: str,
    message: str,
) -> bool:
    """Send a WhatsApp message via Green API. Returns True on success."""
    chat_id = _phone_to_chat_id(phone)
    url = f"{api_url.rstrip('/')}/waInstance{id_instance}/sendMessage/{api_token}"
    try:
        r = requests.post(
            url,
            json={"chatId": chat_id, "message": message},
            timeout=_TIMEOUT,
        )
        if r.status_code == 200:
            return True
        logger.warning("WhatsApp sendMessage failed: status=%s body=%s", r.status_code, r.text[:300])
        return False
    except Exception as exc:
        logger.warning("WhatsApp sendMessage error: %s", exc)
        return False

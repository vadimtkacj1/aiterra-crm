"""Single-worker WhatsApp send queue with rate limiting and retries.

One background thread drains the queue, enforcing a delay between each send
so we stay within Green API's rate limit regardless of how many accounts
submit leads at the same time.
"""
from __future__ import annotations

import logging
import queue
import threading
import time
from dataclasses import dataclass, field

from app.services.whatsapp.sender import send_whatsapp_message

logger = logging.getLogger(__name__)

# Green API safe defaults: 1 message per 1.5 s, up to 3 retries
_SEND_INTERVAL_S = 1.5
_MAX_RETRIES = 3
_RETRY_BASE_DELAY_S = 5.0  # multiplied by attempt number (5s, 10s, 15s)


@dataclass
class _WaJob:
    api_url: str
    id_instance: str
    api_token: str
    phone: str
    message: str
    attempt: int = field(default=0)


class WhatsAppQueue:
    """Thread-safe queue that serialises WhatsApp sends through one worker."""

    def __init__(self, send_interval: float = _SEND_INTERVAL_S) -> None:
        self._q: queue.Queue[_WaJob] = queue.Queue()
        self._send_interval = send_interval
        self._started = False

    def start(self) -> None:
        if self._started:
            return
        self._started = True
        t = threading.Thread(target=self._worker, daemon=True, name="wa-queue")
        t.start()
        logger.info("WhatsApp queue worker started (interval=%.1fs)", self._send_interval)

    def enqueue(
        self,
        api_url: str,
        id_instance: str,
        api_token: str,
        phone: str,
        message: str,
    ) -> None:
        self._q.put(_WaJob(api_url=api_url, id_instance=id_instance, api_token=api_token, phone=phone, message=message))
        logger.debug("WhatsApp queued for %s (queue size ~%d)", phone, self._q.qsize())

    def _worker(self) -> None:
        while True:
            job = self._q.get()
            try:
                ok = send_whatsapp_message(
                    job.api_url, job.id_instance, job.api_token, job.phone, job.message
                )
                if ok:
                    logger.debug("WhatsApp sent OK to %s", job.phone)
                elif job.attempt < _MAX_RETRIES:
                    job.attempt += 1
                    delay = _RETRY_BASE_DELAY_S * job.attempt
                    logger.warning(
                        "WhatsApp send failed for %s, retry %d/%d in %.0fs",
                        job.phone, job.attempt, _MAX_RETRIES, delay,
                    )
                    time.sleep(delay)
                    self._q.put(job)
                else:
                    logger.error(
                        "WhatsApp send permanently failed for %s after %d attempts",
                        job.phone, _MAX_RETRIES,
                    )
            except Exception as exc:
                logger.exception("WhatsApp worker unexpected error: %s", exc)
            finally:
                self._q.task_done()
                time.sleep(self._send_interval)


# Module-level singleton — imported everywhere, started once in lifespan
wa_queue = WhatsAppQueue()

"""Single-worker WhatsApp send queue with rate limiting and retries.

One background thread drains the queue, enforcing GREENAPI_SEND_INTERVAL seconds
between each send so we stay within Green API's rate limit regardless of how many
accounts submit leads simultaneously.

Throughput math (for planning):
  interval=1.5s  → ~40 msg/min  — safe for free Green API plan
  interval=1.0s  → ~60 msg/min  — safe for paid plan
  interval=0.5s  → ~120 msg/min — fast paid plan, use with caution

For 100 accounts: leads rarely arrive all at once. Average burst of ~10 messages
is handled in ~15s. True worst case (100 simultaneous) = 100 * interval seconds.
"""
from __future__ import annotations

import logging
import queue
import threading
import time
from dataclasses import dataclass, field

from app.services.whatsapp.sender import send_whatsapp_message

logger = logging.getLogger(__name__)

_MAX_RETRIES = 3
_RETRY_BASE_DELAY_S = 5.0   # delay = base * attempt  (5s, 10s, 15s)
_QUEUE_WARN_THRESHOLD = 20  # log warning when this many messages are waiting


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

    def __init__(self, send_interval: float, max_size: int) -> None:
        self._q: queue.Queue[_WaJob] = queue.Queue(maxsize=max_size)
        self._send_interval = send_interval
        self._max_size = max_size
        self._started = False
        self._sent_total = 0
        self._dropped_total = 0

    def start(self) -> None:
        if self._started:
            return
        self._started = True
        t = threading.Thread(target=self._worker, daemon=True, name="wa-queue")
        t.start()
        logger.info(
            "WhatsApp queue worker started — interval=%.2fs max_queue=%d "
            "throughput=~%.0f msg/min",
            self._send_interval,
            self._max_size,
            60 / self._send_interval,
        )

    def enqueue(
        self,
        api_url: str,
        id_instance: str,
        api_token: str,
        phone: str,
        message: str,
    ) -> None:
        depth = self._q.qsize()
        if depth >= _QUEUE_WARN_THRESHOLD:
            logger.warning(
                "WhatsApp queue depth=%d — delivery may be delayed ~%.0fs for new messages",
                depth,
                depth * self._send_interval,
            )

        try:
            self._q.put_nowait(
                _WaJob(
                    api_url=api_url,
                    id_instance=id_instance,
                    api_token=api_token,
                    phone=phone,
                    message=message,
                )
            )
            logger.debug("WhatsApp queued for %s (depth=%d)", phone, depth + 1)
        except queue.Full:
            self._dropped_total += 1
            logger.error(
                "WhatsApp queue full (max=%d) — message to %s DROPPED (total dropped=%d). "
                "Increase GREENAPI_QUEUE_MAX_SIZE or lower GREENAPI_SEND_INTERVAL.",
                self._max_size,
                phone,
                self._dropped_total,
            )

    def _worker(self) -> None:
        while True:
            job = self._q.get()
            try:
                ok = send_whatsapp_message(
                    job.api_url, job.id_instance, job.api_token, job.phone, job.message
                )
                if ok:
                    self._sent_total += 1
                    logger.debug(
                        "WhatsApp sent OK to %s (total_sent=%d queue_remaining=%d)",
                        job.phone, self._sent_total, self._q.qsize(),
                    )
                elif job.attempt < _MAX_RETRIES:
                    job.attempt += 1
                    delay = _RETRY_BASE_DELAY_S * job.attempt
                    logger.warning(
                        "WhatsApp send failed for %s, retry %d/%d in %.0fs",
                        job.phone, job.attempt, _MAX_RETRIES, delay,
                    )
                    # Sleep here (blocking the worker) so retries don't skip the interval
                    time.sleep(delay)
                    self._q.put(job)
                else:
                    logger.error(
                        "WhatsApp permanently failed for %s after %d attempts — message lost",
                        job.phone, _MAX_RETRIES,
                    )
            except Exception as exc:
                logger.exception("WhatsApp worker unexpected error: %s", exc)
            finally:
                self._q.task_done()
                time.sleep(self._send_interval)


def _make_queue() -> WhatsAppQueue:
    # Deferred import so settings are resolved after .env is loaded
    from app.core.settings import settings
    return WhatsAppQueue(
        send_interval=settings.greenapi_send_interval,
        max_size=settings.greenapi_queue_max_size,
    )


# Module-level singleton — imported everywhere, started once in lifespan
wa_queue = _make_queue()

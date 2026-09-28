"""Run one outbox dispatcher process: python -m app.modules.jobs.dispatcher."""

import logging
import time
from datetime import datetime

from app.core.config import get_settings
from app.db.session import worker_session
from app.modules.jobs.outbox import DispatchResult, dispatch_pending
from app.modules.jobs.reconciliation import reconcile_expired, reconcile_unclaimed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def dispatch_once(*, now: datetime | None = None) -> DispatchResult:
    with worker_session() as session:
        recovered = reconcile_expired(session, now=now)
    if recovered.requeued or recovered.timed_out or recovered.unknown:
        logger.info("Job reconciliation: %s", recovered)
    with worker_session() as session:
        unclaimed = reconcile_unclaimed(
            session,
            now=now,
            grace_seconds=get_settings().broker_visibility_timeout,
        )
    if unclaimed.requeued or unclaimed.timed_out or unclaimed.unknown:
        logger.info("Unclaimed job reconciliation: %s", unclaimed)
    with worker_session() as session:
        return dispatch_pending(session, now=now)


def main() -> None:
    while True:
        result = dispatch_once()
        if result.published or result.retried or result.discarded:
            logger.info("Job dispatch: %s", result)
        time.sleep(1 if result.published else 2)


if __name__ == "__main__":
    main()

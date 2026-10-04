"""Realtime reads/notification outbox use the party service's authorization boundary."""

from collections.abc import Callable
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.identity.public import Actor
from app.modules.parties import repository, service
from app.modules.parties.models import PartyEvent

read = service.read
act = service.act


def deliver_pending(session: Session, emit: Callable[[str, dict[str, object], str], None]) -> int:
    with session.begin():
        events = list(
            session.scalars(
                select(PartyEvent)
                .where(PartyEvent.delivered_at.is_(None))
                .order_by(PartyEvent.created_at)
                .limit(100)
                .with_for_update(skip_locked=True)
            )
        )
        for event in events:
            # Notifications are hints; recipients fetch authorized durable state.
            recipients = {m.profile_id for m in repository.members(session, event.party_id)}
            removed = event.payload.get("profile_id")
            if event.kind == "member" and event.payload.get("active") is False:
                recipients.add(UUID(str(removed)))
            for profile_id in recipients:
                emit(
                    "party_changed",
                    {"party_id": str(event.party_id), "revision": event.revision},
                    f"profile:{profile_id}",
                )
            event.delivered_at = datetime.now(UTC)
        return len(events)


def check_membership(session: Session, actor: Actor, party_id: UUID) -> None:
    with session.begin():
        service.authorize(session, actor, party_id)

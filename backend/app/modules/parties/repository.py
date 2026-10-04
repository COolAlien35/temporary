from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.parties.models import Membership, Party, PartyEvent


def locked_party(session: Session, party_id: UUID) -> Party | None:
    return session.scalar(select(Party).where(Party.id == party_id).with_for_update())


def members(session: Session, party_id: UUID) -> list[Membership]:
    return list(
        session.scalars(
            select(Membership).where(Membership.party_id == party_id, Membership.active.is_(True))
        )
    )


def events(session: Session, party_id: UUID, after: int, limit: int = 100) -> list[PartyEvent]:
    return list(
        session.scalars(
            select(PartyEvent)
            .where(PartyEvent.party_id == party_id, PartyEvent.revision > after)
            .order_by(PartyEvent.revision)
            .limit(limit)
        )
    )

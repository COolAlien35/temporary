from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.cohorts.models import Cohort, Invitation, Membership


def get_membership(session: Session, cohort_id: UUID, profile_id: UUID) -> Membership | None:
    return session.get(Membership, (cohort_id, profile_id))


def get_cohort(session: Session, cohort_id: UUID) -> Cohort | None:
    return session.get(Cohort, cohort_id)


def get_invitation_for_update(session: Session, token_hash: str) -> Invitation | None:
    return session.scalar(
        select(Invitation).where(Invitation.token_hash == token_hash).with_for_update()
    )


def list_memberships(
    session: Session, profile_id: UUID, limit: int, offset: int
) -> list[tuple[Cohort, Membership]]:
    return list(
        session.execute(
            select(Cohort, Membership)
            .join(Membership, Membership.cohort_id == Cohort.id)
            .where(Membership.profile_id == profile_id)
            .order_by(Cohort.created_at.desc(), Cohort.id.desc())
            .limit(limit)
            .offset(offset)
        ).all()
    )

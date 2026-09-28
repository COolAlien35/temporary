from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import token_hex
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.modules.cohorts.models import Cohort, Invitation, Membership
from app.modules.cohorts.repository import (
    get_cohort,
    get_invitation_for_update,
    get_membership,
    list_memberships,
)
from app.modules.cohorts.schemas import CohortRead, InvitationRead, MemberRead
from app.modules.identity.public import (
    Actor,
    get_profile_summaries,
    get_profile_summary,
)


def require_membership(session: Session, cohort_id: UUID, actor: Actor) -> Membership:
    member = get_membership(session, cohort_id, actor.id)
    if member is None:
        raise HTTPException(status_code=404, detail="Cohort not found")
    return member


def require_instructor(
    session: Session, cohort_id: UUID, actor: Actor, *, lock: bool = False
) -> Cohort:
    member = (
        session.scalar(
            select(Membership)
            .where(Membership.cohort_id == cohort_id, Membership.profile_id == actor.id)
            .with_for_update()
        )
        if lock
        else require_membership(session, cohort_id, actor)
    )
    if member is None:
        raise HTTPException(status_code=404, detail="Cohort not found")
    if member.role != "instructor" or actor.role != "instructor":
        raise HTTPException(status_code=403, detail="Instructor membership required")
    cohort = get_cohort(session, cohort_id)
    assert cohort is not None
    return cohort


def cohort_read(cohort: Cohort, member: Membership) -> CohortRead:
    return CohortRead(
        id=cohort.id, name=cohort.name, role=member.role, created_at=cohort.created_at
    )


def create_cohort(session: Session, actor: Actor, name: str) -> CohortRead:
    if actor.role != "instructor":
        raise HTTPException(status_code=403, detail="Instructor role required")
    with session.begin():
        cohort = Cohort(name=name, created_by=actor.id)
        session.add(cohort)
        session.flush()
        member = Membership(cohort_id=cohort.id, profile_id=actor.id, role="instructor")
        session.add(member)
        session.flush()
        session.refresh(cohort)
    return cohort_read(cohort, member)


def list_cohorts(session: Session, actor: Actor, limit: int, offset: int) -> list[CohortRead]:
    return [
        cohort_read(cohort, member)
        for cohort, member in list_memberships(session, actor.id, limit, offset)
    ]


def read_cohort(session: Session, actor: Actor, cohort_id: UUID) -> CohortRead:
    member = require_membership(session, cohort_id, actor)
    cohort = get_cohort(session, cohort_id)
    assert cohort is not None
    return cohort_read(cohort, member)


def list_members(
    session: Session, actor: Actor, cohort_id: UUID, limit: int, offset: int
) -> list[MemberRead]:
    require_instructor(session, cohort_id, actor)
    members = session.scalars(
        select(Membership)
        .where(Membership.cohort_id == cohort_id)
        .order_by(Membership.joined_at, Membership.profile_id)
        .limit(limit)
        .offset(offset)
    ).all()
    profiles = get_profile_summaries(session, [member.profile_id for member in members])
    return [
        MemberRead(
            profile_id=member.profile_id,
            name=profiles[member.profile_id].name,
            email=profiles[member.profile_id].email,
            role=member.role,
            joined_at=member.joined_at,
        )
        for member in members
    ]


def create_invitation(
    session: Session, actor: Actor, cohort_id: UUID, email: str
) -> InvitationRead:
    token = token_hex(32)
    with session.begin():
        require_instructor(session, cohort_id, actor, lock=True)
        invitation = Invitation(
            cohort_id=cohort_id,
            email=email,
            token_hash=sha256(token.encode()).hexdigest(),
            created_by=actor.id,
            expires_at=datetime.now(UTC) + timedelta(days=7),
        )
        session.add(invitation)
        session.flush()
    return InvitationRead(
        id=invitation.id, email=invitation.email, token=token, expires_at=invitation.expires_at
    )


def accept_invitation(session: Session, actor: Actor, token: str) -> CohortRead:
    with session.begin():
        invitation = get_invitation_for_update(session, sha256(token.encode()).hexdigest())
        if invitation is None or invitation.revoked_at is not None:
            raise HTTPException(status_code=404, detail="Invitation not found")
        if invitation.email != actor.email:
            raise HTTPException(status_code=403, detail="Invitation email does not match")
        if invitation.consumed_at is not None:
            if invitation.consumed_by != actor.id:
                raise HTTPException(status_code=409, detail="Invitation already used")
        elif invitation.expires_at <= datetime.now(UTC):
            raise HTTPException(status_code=410, detail="Invitation expired")
        else:
            query = insert(Membership).values(
                cohort_id=invitation.cohort_id, profile_id=actor.id, role="learner"
            )
            session.execute(query.on_conflict_do_nothing())
            invitation.consumed_by = actor.id
            invitation.consumed_at = datetime.now(UTC)
            session.flush()
        member = get_membership(session, invitation.cohort_id, actor.id)
        if member is None:
            raise HTTPException(status_code=409, detail="Membership has been removed")
        cohort = get_cohort(session, invitation.cohort_id)
        assert cohort is not None
        result = cohort_read(cohort, member)
    return result


def revoke_invitation(session: Session, actor: Actor, cohort_id: UUID, invitation_id: UUID) -> None:
    with session.begin():
        require_instructor(session, cohort_id, actor, lock=True)
        invitation = session.scalar(
            select(Invitation).where(Invitation.id == invitation_id).with_for_update()
        )
        if invitation is None or invitation.cohort_id != cohort_id:
            raise HTTPException(status_code=404, detail="Invitation not found")
        if invitation.consumed_at is not None:
            raise HTTPException(status_code=409, detail="Invitation already used")
        invitation.revoked_at = datetime.now(UTC)


def assign_instructor(session: Session, actor: Actor, cohort_id: UUID, profile_id: UUID) -> None:
    with session.begin():
        cohort = require_instructor(session, cohort_id, actor, lock=True)
        if cohort.created_by != actor.id:
            raise HTTPException(status_code=403, detail="Cohort owner required")
        target = get_profile_summary(session, profile_id)
        if target is None or target.role != "instructor":
            raise HTTPException(status_code=422, detail="Target must be a provisioned instructor")
        query = insert(Membership).values(
            cohort_id=cohort_id, profile_id=profile_id, role="instructor"
        )
        session.execute(
            query.on_conflict_do_update(
                index_elements=[Membership.cohort_id, Membership.profile_id],
                set_={"role": "instructor"},
            )
        )


def remove_member(session: Session, actor: Actor, cohort_id: UUID, profile_id: UUID) -> None:
    with session.begin():
        cohort = require_instructor(session, cohort_id, actor, lock=True)
        if cohort.created_by == profile_id:
            raise HTTPException(status_code=409, detail="Cannot remove cohort owner")
        member = get_membership(session, cohort_id, profile_id)
        if member is None:
            raise HTTPException(status_code=404, detail="Member not found")
        if member.role == "instructor" and cohort.created_by != actor.id:
            raise HTTPException(status_code=403, detail="Cohort owner required")
        session.delete(member)

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.modules.cohorts import service
from app.modules.cohorts.schemas import (
    CohortCreate,
    CohortRead,
    InvitationAccept,
    InvitationCreate,
    InvitationRead,
    MemberRead,
)
from app.modules.identity.public import Actor, get_actor

router = APIRouter(tags=["cohorts"])


@router.post("/cohorts", response_model=CohortRead, status_code=201)
def create_cohort(
    body: CohortCreate,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> CohortRead:
    return service.create_cohort(session, actor, body.name)


@router.get("/cohorts", response_model=list[CohortRead])
def list_cohorts(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> list[CohortRead]:
    return service.list_cohorts(session, actor, limit, offset)


@router.get("/cohorts/{cohort_id}", response_model=CohortRead)
def read_cohort(
    cohort_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> CohortRead:
    return service.read_cohort(session, actor, cohort_id)


@router.get("/cohorts/{cohort_id}/members", response_model=list[MemberRead])
def list_members(
    cohort_id: UUID,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> list[MemberRead]:
    return service.list_members(session, actor, cohort_id, limit, offset)


@router.post("/cohorts/{cohort_id}/invitations", response_model=InvitationRead, status_code=201)
def invite_learner(
    cohort_id: UUID,
    body: InvitationCreate,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> InvitationRead:
    return service.create_invitation(session, actor, cohort_id, body.email)


@router.post("/cohort-invitations/accept", response_model=CohortRead)
def accept_invitation(
    body: InvitationAccept,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> CohortRead:
    return service.accept_invitation(session, actor, body.token)


@router.delete("/cohorts/{cohort_id}/invitations/{invitation_id}", status_code=204)
def revoke_invitation(
    cohort_id: UUID,
    invitation_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> Response:
    service.revoke_invitation(session, actor, cohort_id, invitation_id)
    return Response(status_code=204)


@router.put("/cohorts/{cohort_id}/instructors/{profile_id}", status_code=204)
def assign_instructor(
    cohort_id: UUID,
    profile_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> Response:
    service.assign_instructor(session, actor, cohort_id, profile_id)
    return Response(status_code=204)


@router.delete("/cohorts/{cohort_id}/members/{profile_id}", status_code=204)
def remove_member(
    cohort_id: UUID,
    profile_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> Response:
    service.remove_member(session, actor, cohort_id, profile_id)
    return Response(status_code=204)

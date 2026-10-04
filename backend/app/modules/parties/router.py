from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.modules.identity.public import Actor, get_actor
from app.modules.parties import service
from app.modules.parties.schemas import (
    FreezeCreate,
    InviteAccept,
    InviteCreate,
    PartyCreate,
    RoomAction,
)

router = APIRouter(tags=["parties"])


@router.post("/parties", status_code=201)
def create(
    body: PartyCreate,
    idempotency_key: Annotated[UUID, Header()],
    actor: Annotated[Actor, Depends(get_actor)],
    session: Annotated[Session, Depends(get_session)],
) -> dict[str, object]:
    return service.create(session, actor, body, idempotency_key)


@router.post("/party-invitations/accept")
def accept(
    body: InviteAccept,
    actor: Annotated[Actor, Depends(get_actor)],
    session: Annotated[Session, Depends(get_session)],
) -> dict[str, object]:
    return service.accept(session, actor, body.token)


@router.get("/parties/{party_id}")
def read(
    party_id: UUID,
    actor: Annotated[Actor, Depends(get_actor)],
    session: Annotated[Session, Depends(get_session)],
    after: int | None = Query(default=None, ge=0),
) -> dict[str, object]:
    return service.read(session, actor, party_id, after)


@router.post("/parties/{party_id}/invitations", status_code=201)
def invite(
    party_id: UUID,
    body: InviteCreate,
    actor: Annotated[Actor, Depends(get_actor)],
    session: Annotated[Session, Depends(get_session)],
) -> dict[str, object]:
    return service.invite(session, actor, party_id, body)


@router.delete("/parties/{party_id}/invitations/{invitation_id}", status_code=204)
def revoke(
    party_id: UUID,
    invitation_id: UUID,
    actor: Annotated[Actor, Depends(get_actor)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    service.revoke_invite(session, actor, party_id, invitation_id)
    return Response(status_code=204)


@router.post("/parties/{party_id}/actions")
def action(
    party_id: UUID,
    body: RoomAction,
    actor: Annotated[Actor, Depends(get_actor)],
    session: Annotated[Session, Depends(get_session)],
) -> dict[str, object]:
    return service.act(session, actor, party_id, body)


@router.delete("/parties/{party_id}/members/{profile_id}", status_code=204)
def remove(
    party_id: UUID,
    profile_id: UUID,
    actor: Annotated[Actor, Depends(get_actor)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    service.remove(session, actor, party_id, profile_id)
    return Response(status_code=204)


@router.delete("/parties/{party_id}", status_code=204)
def close(
    party_id: UUID,
    actor: Annotated[Actor, Depends(get_actor)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    service.close(session, actor, party_id)
    return Response(status_code=204)


@router.post("/parties/{party_id}/circuit-copy", status_code=201)
def freeze(
    party_id: UUID,
    body: FreezeCreate,
    idempotency_key: Annotated[UUID, Header()],
    actor: Annotated[Actor, Depends(get_actor)],
    session: Annotated[Session, Depends(get_session)],
) -> dict[str, object]:
    return service.freeze(session, actor, party_id, body.revision, idempotency_key)

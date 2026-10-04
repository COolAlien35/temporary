import re
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Response
from sqlalchemy.orm import Session

from app.core.errors import ApiHTTPException
from app.db.session import get_session
from app.modules.circuits import service
from app.modules.circuits.schemas import CircuitArchive, CircuitDraft, CircuitPage, CircuitRead
from app.modules.identity.public import Actor, get_actor

router = APIRouter(prefix="/circuits", tags=["circuits"])


def with_etag(response: Response, circuit: CircuitRead) -> CircuitRead:
    response.headers["ETag"] = f'"rev-{circuit.revision}"'
    return circuit


def parse_if_match(value: str | None) -> int:
    if value is None:
        raise ApiHTTPException(428, "precondition_required", "If-Match header required")
    match = re.fullmatch(r'"rev-([1-9][0-9]*)"', value)
    if match is None:
        raise ApiHTTPException(400, "invalid_precondition", "Invalid If-Match header")
    return int(match.group(1))


@router.post("", response_model=CircuitRead, response_model_exclude_none=True, status_code=201)
def create_circuit(
    body: CircuitDraft,
    response: Response,
    idempotency_key: UUID = Header(),  # noqa: B008
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> CircuitRead:
    return with_etag(response, service.create_circuit(session, actor, body, idempotency_key))


@router.get("", response_model=CircuitPage)
def list_circuits(
    limit: int = Query(default=20, ge=1, le=50),
    cursor: str | None = Query(default=None),
    archived: bool = Query(default=False),
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> CircuitPage:
    return service.list_circuits(session, actor, limit, cursor, archived)


@router.get("/{circuit_id}", response_model=CircuitRead, response_model_exclude_none=True)
def read_circuit(
    circuit_id: UUID,
    response: Response,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> CircuitRead:
    return with_etag(response, service.read_circuit(session, actor, circuit_id))


@router.get(
    "/{circuit_id}/revisions/{revision_number}",
    response_model=CircuitRead,
    response_model_exclude_none=True,
)
def read_circuit_revision(
    circuit_id: UUID,
    revision_number: int,
    response: Response,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> CircuitRead:
    return with_etag(
        response, service.read_circuit_revision(session, actor, circuit_id, revision_number)
    )


@router.put("/{circuit_id}", response_model=CircuitRead, response_model_exclude_none=True)
def update_circuit(
    circuit_id: UUID,
    body: CircuitDraft,
    response: Response,
    if_match: str | None = Header(default=None),
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> CircuitRead:
    return with_etag(
        response,
        service.update_circuit(session, actor, circuit_id, body, parse_if_match(if_match)),
    )


@router.patch("/{circuit_id}/archive", response_model=CircuitRead, response_model_exclude_none=True)
def archive_circuit(
    circuit_id: UUID,
    body: CircuitArchive,
    response: Response,
    if_match: str | None = Header(default=None),
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> CircuitRead:
    return with_etag(
        response,
        service.archive_circuit(
            session, actor, circuit_id, body.archived, parse_if_match(if_match)
        ),
    )

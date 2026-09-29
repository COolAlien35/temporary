from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.modules.identity.public import Actor, get_actor
from app.modules.predictions import service
from app.modules.predictions.schemas import (
    AgreementHistory,
    LearningSessionCreate,
    LearningSessionPage,
    LearningSessionRead,
    PredictionPage,
    PredictionPair,
    PredictionRead,
    PredictionSubmission,
)

router = APIRouter(tags=["learning"])


@router.get("/learning-sessions", response_model=LearningSessionPage)
def list_learning_sessions(
    lesson_id: str | None = Query(default=None, min_length=1, max_length=120),
    limit: int = Query(default=20, ge=1, le=50),
    cursor: UUID | None = None,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> LearningSessionPage:
    return service.list_learning_sessions(session, actor, lesson_id, limit, cursor)


@router.post("/learning-sessions", response_model=LearningSessionRead, status_code=201)
def create_learning_session(
    body: LearningSessionCreate,
    idempotency_key: UUID = Header(),  # noqa: B008
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> LearningSessionRead:
    return LearningSessionRead.model_validate(
        service.create_learning_session(session, actor, body, idempotency_key)
    )


@router.get("/learning-sessions/{learning_session_id}", response_model=LearningSessionRead)
def read_learning_session(
    learning_session_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> LearningSessionRead:
    return LearningSessionRead.model_validate(
        service.read_learning_session(session, actor, learning_session_id)
    )


@router.get(
    "/learning-sessions/{learning_session_id}/agreement-history",
    response_model=AgreementHistory,
)
def agreement_history(
    learning_session_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> AgreementHistory:
    return service.recent_agreement_history(session, actor, learning_session_id)


@router.post(
    "/learning-sessions/{learning_session_id}/predictions",
    response_model=PredictionRead,
    status_code=201,
)
def create_prediction(
    learning_session_id: UUID,
    body: PredictionSubmission,
    idempotency_key: UUID = Header(),  # noqa: B008
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> PredictionRead:
    record = service.create_prediction(session, actor, learning_session_id, body, idempotency_key)
    return service.read_prediction_view(session, actor, record.id)


@router.get("/learning-sessions/{learning_session_id}/predictions", response_model=PredictionPage)
def list_predictions(
    learning_session_id: UUID,
    limit: int = Query(default=20, ge=1, le=50),
    cursor: UUID | None = None,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> PredictionPage:
    return service.list_predictions(session, actor, learning_session_id, limit, cursor)


@router.get("/predictions/{prediction_id}", response_model=PredictionRead)
def read_prediction(
    prediction_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> PredictionRead:
    return service.read_prediction_view(session, actor, prediction_id)


@router.get("/predictions/{prediction_id}/pair", response_model=PredictionPair)
def read_prediction_pair(
    prediction_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> PredictionPair:
    return service.read_prediction_pair(session, actor, prediction_id)

import json
from hashlib import sha256
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.errors import ApiHTTPException
from app.modules.curriculum.public import find_lesson
from app.modules.identity.public import Actor
from app.modules.predictions.models import LearningSession, Prediction
from app.modules.predictions.repository import get_owned_prediction, get_owned_session
from app.modules.predictions.schemas import (
    LearningSessionCreate,
    PredictionRead,
    PredictionSubmission,
)


def request_hash(body: LearningSessionCreate | PredictionSubmission) -> str:
    canonical = json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return sha256(canonical.encode()).hexdigest()


def require_same_request(actual_hash: str, expected_hash: str) -> None:
    if actual_hash != expected_hash:
        raise ApiHTTPException(409, "idempotency_conflict", "Idempotency key already used")


def create_learning_session(
    session: Session, actor: Actor, body: LearningSessionCreate, key: UUID
) -> LearningSession:
    digest = request_hash(body)
    with session.begin():
        existing = session.scalar(
            select(LearningSession).where(
                LearningSession.learner_id == actor.id,
                LearningSession.idempotency_key == key,
            )
        )
        if existing is not None:
            require_same_request(existing.request_hash, digest)
            return existing
        lesson = find_lesson(body.lesson_id)
        if lesson is None:
            raise HTTPException(status_code=404, detail="Lesson not found")
        if lesson.version != body.lesson_version:
            raise ApiHTTPException(409, "content_version_conflict", "Lesson version has changed")
        created_id = session.scalar(
            insert(LearningSession)
            .values(
                id=uuid4(),
                learner_id=actor.id,
                lesson_id=body.lesson_id,
                lesson_version=body.lesson_version,
                idempotency_key=key,
                request_hash=digest,
            )
            .on_conflict_do_nothing(
                index_elements=[LearningSession.learner_id, LearningSession.idempotency_key]
            )
            .returning(LearningSession.id)
        )
        if created_id is None:
            existing = session.scalar(
                select(LearningSession).where(
                    LearningSession.learner_id == actor.id,
                    LearningSession.idempotency_key == key,
                )
            )
            assert existing is not None
            require_same_request(existing.request_hash, digest)
            return existing
        created = session.get_one(LearningSession, created_id)
    return created


def read_learning_session(
    session: Session, actor: Actor, learning_session_id: UUID
) -> LearningSession:
    record = get_owned_session(session, actor.id, learning_session_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Learning session not found")
    return record


def create_prediction(
    session: Session,
    actor: Actor,
    learning_session_id: UUID,
    body: PredictionSubmission,
    key: UUID,
) -> Prediction:
    digest = request_hash(body)
    with session.begin():
        existing = session.scalar(
            select(Prediction).where(
                Prediction.learner_id == actor.id,
                Prediction.idempotency_key == key,
            )
        )
        if existing is not None:
            require_same_request(existing.request_hash, digest)
            if existing.learning_session_id != learning_session_id:
                raise ApiHTTPException(409, "idempotency_conflict", "Idempotency key already used")
            return existing
        learning_session = get_owned_session(session, actor.id, learning_session_id)
        if learning_session is None:
            raise HTTPException(status_code=404, detail="Learning session not found")
        if (
            body.learning_session_id != learning_session.id
            or body.lesson_id != learning_session.lesson_id
            or body.lesson_version != learning_session.lesson_version
        ):
            raise ApiHTTPException(409, "session_mismatch", "Prediction does not match the session")
        created_id = session.scalar(
            insert(Prediction)
            .values(
                id=uuid4(),
                learner_id=actor.id,
                learning_session_id=learning_session.id,
                lesson_id=body.lesson_id,
                lesson_version=body.lesson_version,
                schema_version=body.schema_version,
                prediction_vector=body.prediction_vector,
                basis_labels=body.basis_labels,
                measurement_qubits=body.measurement_qubits,
                comparison_basis=body.comparison_basis,
                confidence=body.confidence,
                idempotency_key=key,
                request_hash=digest,
            )
            .on_conflict_do_nothing(
                index_elements=[Prediction.learner_id, Prediction.idempotency_key]
            )
            .returning(Prediction.id)
        )
        if created_id is None:
            existing = session.scalar(
                select(Prediction).where(
                    Prediction.learner_id == actor.id,
                    Prediction.idempotency_key == key,
                )
            )
            assert existing is not None
            require_same_request(existing.request_hash, digest)
            if existing.learning_session_id != learning_session_id:
                raise ApiHTTPException(409, "idempotency_conflict", "Idempotency key already used")
            return existing
        created = session.get_one(Prediction, created_id)
    return created


def read_prediction(session: Session, actor: Actor, prediction_id: UUID) -> Prediction:
    record = get_owned_prediction(session, actor.id, prediction_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return record


def prediction_read(record: Prediction) -> PredictionRead:
    return PredictionRead.model_validate(
        {
            "id": record.id,
            "schema_version": record.schema_version,
            "lesson_id": record.lesson_id,
            "lesson_version": record.lesson_version,
            "learning_session_id": record.learning_session_id,
            "prediction_vector": record.prediction_vector,
            "basis_labels": record.basis_labels,
            "measurement_qubits": record.measurement_qubits,
            "comparison_basis": record.comparison_basis,
            "confidence": record.confidence,
            "locked_at": record.locked_at,
        }
    )

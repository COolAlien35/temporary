import json
from hashlib import sha256
from typing import cast
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.errors import ApiHTTPException
from app.modules.curriculum.public import find_lesson
from app.modules.experiments.public import read_owned_run
from app.modules.identity.public import Actor
from app.modules.predictions.metric import prediction_agreement
from app.modules.predictions.models import LearningSession, Prediction
from app.modules.predictions.repository import get_owned_prediction, get_owned_session
from app.modules.predictions.schemas import (
    ComparisonBasis,
    LearningSessionCreate,
    PredictionPair,
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


def prediction_read(record: Prediction, status: str = "unpaired") -> PredictionRead:
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
            "run_id": record.run_id,
            "pairing_status": status,
        }
    )


def read_prediction_view(session: Session, actor: Actor, prediction_id: UUID) -> PredictionRead:
    record = read_prediction(session, actor, prediction_id)
    if record.run_id is None:
        return prediction_read(record)
    run = read_owned_run(session, actor, record.run_id)
    status = (
        "paired"
        if run.status == "succeeded"
        else ("failed" if run.status in {"failed", "cancelled", "timed_out"} else "pending")
    )
    return prediction_read(record, status)


def read_prediction_pair(session: Session, actor: Actor, prediction_id: UUID) -> PredictionPair:
    record = read_prediction(session, actor, prediction_id)
    if record.run_id is None:
        raise ApiHTTPException(409, "prediction_unpaired", "Prediction has no run")
    run = read_owned_run(session, actor, record.run_id)
    if run.status != "succeeded" or run.result is None:
        raise ApiHTTPException(409, "result_unavailable", "The paired run has no successful result")
    result = run.result
    labels = record.basis_labels
    if result.get("measurement_qubits") != record.measurement_qubits:
        raise ApiHTTPException(
            500, "result_mismatch", "Saved result measurement differs from prediction"
        )
    if record.comparison_basis == "ideal_probability":
        distribution = result.get("exact_probabilities")
    elif record.comparison_basis == "sampled_frequency":
        counts = result.get("counts")
        distribution = (
            {label: counts.get(label, 0) / run.shots for label in labels}
            if isinstance(counts, dict) and set(counts).issubset(set(labels))
            else None
        )
    else:
        raise ApiHTTPException(500, "result_mismatch", "Unsupported saved comparison basis")
    if not isinstance(distribution, dict) or set(distribution) != set(labels):
        raise ApiHTTPException(500, "result_mismatch", "Saved result basis differs from prediction")
    simulated = [float(distribution[label]) for label in labels]
    return PredictionPair(
        schema_version=1,
        prediction_id=record.id,
        run_id=run.id,
        prediction_vector=record.prediction_vector,
        simulated_vector=simulated,
        basis_labels=labels,
        measurement_qubits=record.measurement_qubits,
        comparison_basis=cast(ComparisonBasis, record.comparison_basis),
        prediction_match=prediction_agreement(record.prediction_vector, simulated),
        backend=run.backend,
        shots=run.shots,
        seed=run.seed,
        circuit_revision=run.circuit_revision,
    )

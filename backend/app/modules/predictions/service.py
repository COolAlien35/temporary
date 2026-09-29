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
from app.modules.experiments.schemas import RunRead
from app.modules.identity.public import Actor
from app.modules.predictions.metric import prediction_agreement
from app.modules.predictions.models import LearningSession, Prediction
from app.modules.predictions.repository import (
    get_owned_prediction,
    get_owned_session,
    list_owned_sessions,
    list_session_predictions,
    recent_lesson_predictions,
)
from app.modules.predictions.schemas import (
    AgreementHistory,
    AgreementHistoryItem,
    ComparisonBasis,
    LearningSessionCreate,
    LearningSessionPage,
    LearningSessionRead,
    OutcomeDelta,
    PredictionPage,
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


def list_learning_sessions(
    session: Session, actor: Actor, lesson_id: str | None, limit: int, cursor: UUID | None
) -> LearningSessionPage:
    anchor = get_owned_session(session, actor.id, cursor) if cursor is not None else None
    if cursor is not None and (anchor is None or (lesson_id and anchor.lesson_id != lesson_id)):
        raise ApiHTTPException(422, "invalid_cursor", "Invalid learning session cursor")
    rows = list_owned_sessions(session, actor.id, lesson_id, limit + 1, anchor)
    visible = rows[:limit]
    return LearningSessionPage(
        items=[LearningSessionRead.model_validate(row) for row in visible],
        next_cursor=visible[-1].id if len(rows) > limit else None,
    )


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
    return prediction_view_for_record(session, actor, record)


def prediction_view_for_record(
    session: Session, actor: Actor, record: Prediction
) -> PredictionRead:
    if record.run_id is None:
        return prediction_read(record)
    run = read_owned_run(session, actor, record.run_id)
    status = (
        "paired"
        if run.status == "succeeded"
        else ("failed" if run.status in {"failed", "cancelled", "timed_out"} else "pending")
    )
    return prediction_read(record, status)


def list_predictions(
    session: Session,
    actor: Actor,
    learning_session_id: UUID,
    limit: int,
    cursor: UUID | None,
) -> PredictionPage:
    read_learning_session(session, actor, learning_session_id)
    anchor = get_owned_prediction(session, actor.id, cursor) if cursor is not None else None
    if cursor is not None and (anchor is None or anchor.learning_session_id != learning_session_id):
        raise ApiHTTPException(422, "invalid_cursor", "Invalid prediction cursor")
    rows = list_session_predictions(session, actor.id, learning_session_id, limit + 1, anchor)
    visible = rows[:limit]
    return PredictionPage(
        items=[prediction_view_for_record(session, actor, row) for row in visible],
        next_cursor=visible[-1].id if len(rows) > limit else None,
    )


def read_prediction_pair(session: Session, actor: Actor, prediction_id: UUID) -> PredictionPair:
    record = read_prediction(session, actor, prediction_id)
    if record.run_id is None:
        raise ApiHTTPException(409, "prediction_unpaired", "Prediction has no run")
    run = read_owned_run(session, actor, record.run_id)
    if run.status != "succeeded" or run.result is None:
        raise ApiHTTPException(409, "result_unavailable", "The paired run has no successful result")
    return _completed_pair(record, run)


def _completed_pair(record: Prediction, run: RunRead) -> PredictionPair:
    assert run.result is not None
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


def recent_agreement_history(
    session: Session, actor: Actor, learning_session_id: UUID
) -> AgreementHistory:
    learning = read_learning_session(session, actor, learning_session_id)
    candidates = recent_lesson_predictions(
        session, actor.id, learning.lesson_id, learning.lesson_version, 26
    )
    items: list[AgreementHistoryItem] = []
    scanned_count = 0
    for prediction in candidates[:25]:
        scanned_count += 1
        if prediction.run_id is None:
            continue
        run = read_owned_run(session, actor, prediction.run_id)
        if run.status != "succeeded" or run.result is None:
            continue
        pair = _completed_pair(prediction, run)
        deltas = [
            OutcomeDelta(
                basis_label=label,
                predicted=predicted,
                simulated=simulated,
                delta=simulated - predicted,
            )
            for label, predicted, simulated in zip(
                pair.basis_labels, pair.prediction_vector, pair.simulated_vector, strict=True
            )
        ]
        deltas.sort(key=lambda value: (-abs(value.delta), value.basis_label))
        items.append(
            AgreementHistoryItem(
                learning_session_id=prediction.learning_session_id,
                prediction_id=prediction.id,
                run_id=run.id,
                locked_at=prediction.locked_at,
                comparison_basis=pair.comparison_basis,
                prediction_match=pair.prediction_match,
                confidence=prediction.confidence,
                backend=pair.backend,
                shots=pair.shots,
                seed=pair.seed,
                circuit_revision=pair.circuit_revision,
                largest_deltas=deltas[:3],
            )
        )
        if len(items) == 5:
            break
    return AgreementHistory(
        lesson_id=learning.lesson_id,
        lesson_version=learning.lesson_version,
        learning_session_id=learning.id,
        items=items,
        scanned_count=scanned_count,
        older_records_not_scanned=len(candidates) > scanned_count,
        unavailable_sources=["missed_questions", "hints", "next_lessons"],
    )

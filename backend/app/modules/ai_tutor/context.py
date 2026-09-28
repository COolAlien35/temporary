"""Authorized and bounded source context for one tutor call."""

from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.errors import ApiHTTPException
from app.modules.circuits.public import owned_revision
from app.modules.curriculum.public import learner_lesson
from app.modules.experiments.public import read_owned_run
from app.modules.identity.public import Actor
from app.modules.predictions.public import (
    owned_prediction_session,
    tutor_agreement_history,
)
from app.modules.predictions.schemas import AgreementHistory

TutorAction = Literal["explain", "changed", "unexpected", "optimize", "generate", "plan"]
TutorStage = Literal["learn", "predict", "build", "run", "observe", "discuss"]


@dataclass(frozen=True)
class TutorContext:
    lesson_id: str
    lesson_title: str
    lesson_excerpt: str
    stage: TutorStage
    circuit: dict[str, object] | None
    run_id: UUID | None
    run_status: str | None
    run_error_code: str | None
    backend: str | None
    result_preview: dict[str, object] | None
    history: AgreementHistory
    source_record_ids: tuple[str, ...]


def load_tutor_context(
    session: Session,
    actor: Actor,
    learning_session_id: UUID,
    *,
    stage: TutorStage,
    run_id: UUID | None = None,
    circuit_id: UUID | None = None,
    circuit_revision: int | None = None,
) -> TutorContext:
    history = tutor_agreement_history(session, actor, learning_session_id)
    lesson = learner_lesson(history.lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    excerpt = " ".join(section.text for section in lesson.sections[:4])[:1_200]
    circuit: dict[str, object] | None = None
    run_status = run_error_code = backend = None
    result_preview: dict[str, object] | None = None
    sources = [str(learning_session_id)]
    if run_id is not None:
        run = read_owned_run(session, actor, run_id)
        if run.prediction_id is None or (
            owned_prediction_session(session, actor, run.prediction_id) != learning_session_id
        ):
            raise ApiHTTPException(409, "context_mismatch", "Run belongs to another lesson session")
        if circuit_id is not None and (
            run.circuit_id != circuit_id or run.circuit_revision != circuit_revision
        ):
            raise ApiHTTPException(409, "context_mismatch", "Circuit does not match the run")
        circuit = _bounded_circuit(run.circuit_snapshot.model_dump(mode="json"))
        run_status, run_error_code, backend = run.status, run.error_code, run.backend
        if run.result is not None:
            counts = run.result.get("counts")
            if isinstance(counts, dict):
                top_counts = sorted(counts.items(), key=lambda item: -int(item[1]))[:8]
                result_preview = {"shots": run.shots, "top_counts": top_counts}
        sources.append(str(run.id))
    elif circuit_id is not None:
        if circuit_revision is None:
            raise ApiHTTPException(422, "circuit_revision_required", "Circuit revision is required")
        revision = owned_revision(session, actor.id, circuit_id, circuit_revision)
        if revision is None:
            raise HTTPException(status_code=404, detail="Circuit revision not found")
        circuit = _bounded_circuit(revision.snapshot.model_dump(mode="json"))
        sources.append(f"{revision.circuit_id}:{circuit_revision}")
    for item in history.items:
        sources.extend((str(item.prediction_id), str(item.run_id)))
    return TutorContext(
        lesson_id=history.lesson_id,
        lesson_title=lesson.title,
        lesson_excerpt=excerpt,
        stage=stage,
        circuit=circuit,
        run_id=run_id,
        run_status=run_status,
        run_error_code=run_error_code,
        backend=backend,
        result_preview=result_preview,
        history=history,
        source_record_ids=tuple(dict.fromkeys(sources)),
    )


def _bounded_circuit(snapshot: dict[str, object]) -> dict[str, object]:
    gates = snapshot.get("gates")
    return {
        "schema_version": snapshot.get("schema_version"),
        "qubits": snapshot.get("qubits"),
        "gates": gates[:64] if isinstance(gates, list) else [],
        "gates_truncated": isinstance(gates, list) and len(gates) > 64,
    }

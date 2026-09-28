"""Authorized and bounded source context for one tutor call."""

from dataclasses import dataclass
from math import isfinite
from typing import Literal
from urllib.parse import urlsplit
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.errors import ApiHTTPException
from app.modules.circuits.public import owned_revision
from app.modules.curriculum.public import find_lesson, learner_lesson
from app.modules.experiments.public import read_owned_run
from app.modules.identity.public import Actor
from app.modules.predictions.public import (
    owned_prediction_session,
    tutor_agreement_history,
)
from app.modules.predictions.schemas import AgreementHistory

TutorAction = Literal["explain", "changed", "unexpected", "optimize", "generate", "plan"]
TutorStage = Literal["learn", "predict", "build", "run", "observe", "discuss"]
LOCAL_AER_CAPABILITIES = (
    "ideal_simulation",
    "seeded_sampling",
    "no_noise_model",
    "no_mid_circuit_measurement",
)


@dataclass(frozen=True)
class TutorCandidate:
    id: str
    label: str
    href: str


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
    backend_capabilities: tuple[str, ...]
    result_preview: dict[str, object] | None
    history: AgreementHistory
    candidates: tuple[TutorCandidate, ...]
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
    lesson_ref = find_lesson(history.lesson_id)
    if lesson is None or lesson_ref is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if history.lesson_version != lesson_ref.version:
        raise ApiHTTPException(409, "content_version_conflict", "Lesson version has changed")
    excerpt = " ".join(section.text for section in lesson.sections[:4])[:1_200]
    circuit: dict[str, object] | None = None
    run_status = run_error_code = backend = None
    backend_capabilities: tuple[str, ...] = ()
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
        run_status, backend = run.status, run.backend
        run_error_code = "simulation_failed" if run.error_code else None
        if backend == "qiskit_aer":
            backend_capabilities = LOCAL_AER_CAPABILITIES
        if run.result is not None:
            raw_counts = run.result.get("counts")
            raw_probabilities = run.result.get("exact_probabilities")
            counts = _bounded_distribution(raw_counts, integral=True)
            probabilities = _bounded_distribution(raw_probabilities)
            capabilities = run.result.get("capabilities")
            if isinstance(capabilities, list):
                result_capabilities = tuple(
                    item
                    for item in capabilities[:8]
                    if item in {"exact_probabilities", "shot_counts", "statevector"}
                )
                backend_capabilities = tuple(
                    dict.fromkeys((*backend_capabilities, *result_capabilities))
                )
            result_preview = {
                "shots": run.shots,
                "top_counts": counts,
                "top_exact_probabilities": probabilities,
                "distributions_truncated": (
                    isinstance(raw_counts, dict) and len(counts) < len(raw_counts)
                )
                or (
                    isinstance(raw_probabilities, dict)
                    and len(probabilities) < len(raw_probabilities)
                ),
            }
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
    candidates = [
        TutorCandidate(
            id="revisit_lesson",
            label=f"Revisit {lesson.title}",
            href=f"/curriculum/{lesson_ref.unit_id}/{lesson.id}",
        )
    ]
    for index, link in enumerate(lesson.links[:3]):
        if _valid_tool_link(link.href):
            candidates.append(
                TutorCandidate(id=f"current_experiment_{index}", label=link.label, href=link.href)
            )
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
        backend_capabilities=backend_capabilities,
        result_preview=result_preview,
        history=history,
        candidates=tuple(candidates),
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


def _bounded_distribution(
    value: object, *, integral: bool = False
) -> list[tuple[str, int | float]]:
    if not isinstance(value, dict):
        return []
    entries = [
        (label, count)
        for label, count in value.items()
        if isinstance(label, str)
        and len(label) <= 8
        and isinstance(count, int | float)
        and not isinstance(count, bool)
        and isfinite(count)
        and count >= 0
        and (not integral or isinstance(count, int))
    ]
    return sorted(entries, key=lambda item: (-item[1], item[0]))[:8]


def _valid_tool_link(href: str) -> bool:
    parsed = urlsplit(href)
    return (
        not parsed.scheme
        and not parsed.netloc
        and not parsed.fragment
        and parsed.path in {"/studio", "/curriculum/practice", "/hardware/studio"}
        and len(parsed.query) <= 80
        and not any(character.isspace() for character in href)
    )

"""Prediction operations available to the experiment module."""

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiHTTPException
from app.modules.identity.public import Actor
from app.modules.predictions.models import Prediction
from app.modules.predictions.schemas import AgreementHistory


def bind_prediction(
    session: Session,
    actor: Actor,
    prediction_id: UUID,
    run_id: UUID,
    circuit_qubits: int,
    measurement_qubits: tuple[int, ...],
) -> None:
    """Bind a locked prediction inside the run creation transaction."""
    prediction = session.scalar(
        select(Prediction)
        .where(Prediction.id == prediction_id, Prediction.learner_id == actor.id)
        .with_for_update()
    )
    if prediction is None:
        raise HTTPException(status_code=404, detail="Prediction not found")
    if prediction.run_id is not None:
        raise ApiHTTPException(409, "prediction_already_paired", "Prediction already has a run")
    if prediction.comparison_basis not in {"ideal_probability", "sampled_frequency"}:
        raise ApiHTTPException(422, "unsupported_comparison_basis", "Local Aer has no noise model")
    if prediction.measurement_qubits != list(measurement_qubits) or any(
        qubit >= circuit_qubits for qubit in prediction.measurement_qubits
    ):
        raise ApiHTTPException(
            422, "measurement_mismatch", "Prediction measurement does not match the circuit"
        )
    prediction.run_id = run_id


def tutor_agreement_history(
    session: Session, actor: Actor, learning_session_id: UUID
) -> AgreementHistory:
    """A bounded owner-scoped projection for tutor context."""
    from app.modules.predictions.service import recent_agreement_history

    return recent_agreement_history(session, actor, learning_session_id)

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.predictions.models import LearningSession, Prediction


def get_owned_session(
    session: Session, learner_id: UUID, learning_session_id: UUID
) -> LearningSession | None:
    return session.scalar(
        select(LearningSession).where(
            LearningSession.id == learning_session_id,
            LearningSession.learner_id == learner_id,
        )
    )


def get_owned_prediction(
    session: Session, learner_id: UUID, prediction_id: UUID
) -> Prediction | None:
    return session.scalar(
        select(Prediction).where(
            Prediction.id == prediction_id, Prediction.learner_id == learner_id
        )
    )


def recent_session_predictions(
    session: Session, learner_id: UUID, learning_session_id: UUID, limit: int
) -> list[Prediction]:
    return list(
        session.scalars(
            select(Prediction)
            .where(
                Prediction.learner_id == learner_id,
                Prediction.learning_session_id == learning_session_id,
            )
            .order_by(Prediction.locked_at.desc(), Prediction.id.desc())
            .limit(limit)
        )
    )

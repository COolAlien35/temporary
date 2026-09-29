from uuid import UUID

from sqlalchemy import select, tuple_
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


def recent_lesson_predictions(
    session: Session, learner_id: UUID, lesson_id: str, lesson_version: int, limit: int
) -> list[Prediction]:
    return list(
        session.scalars(
            select(Prediction)
            .where(
                Prediction.learner_id == learner_id,
                Prediction.lesson_id == lesson_id,
                Prediction.lesson_version == lesson_version,
            )
            .order_by(Prediction.locked_at.desc(), Prediction.id.desc())
            .limit(limit)
        )
    )


def list_owned_sessions(
    session: Session,
    learner_id: UUID,
    lesson_id: str | None,
    limit: int,
    cursor: LearningSession | None,
) -> list[LearningSession]:
    query = select(LearningSession).where(LearningSession.learner_id == learner_id)
    if lesson_id is not None:
        query = query.where(LearningSession.lesson_id == lesson_id)
    if cursor is not None:
        query = query.where(
            tuple_(LearningSession.created_at, LearningSession.id) < (cursor.created_at, cursor.id)
        )
    return list(
        session.scalars(
            query.order_by(LearningSession.created_at.desc(), LearningSession.id.desc()).limit(
                limit
            )
        )
    )


def list_session_predictions(
    session: Session,
    learner_id: UUID,
    learning_session_id: UUID,
    limit: int,
    cursor: Prediction | None,
) -> list[Prediction]:
    query = select(Prediction).where(
        Prediction.learner_id == learner_id,
        Prediction.learning_session_id == learning_session_id,
    )
    if cursor is not None:
        query = query.where(
            tuple_(Prediction.locked_at, Prediction.id) < (cursor.locked_at, cursor.id)
        )
    return list(
        session.scalars(
            query.order_by(Prediction.locked_at.desc(), Prediction.id.desc()).limit(limit)
        )
    )

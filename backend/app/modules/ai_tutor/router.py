"""Owner-scoped tutor message routes."""

from uuid import UUID

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.integrations.ai.chat import ChatProvider, OpenAICompatibleChatProvider
from app.modules.ai_tutor.schemas import TutorMessageCreate, TutorMessageRead
from app.modules.ai_tutor.service import list_messages, read_message, submit_message
from app.modules.identity.public import Actor, get_actor

router = APIRouter(tags=["tutor"])


def get_tutor_provider(settings: Settings = Depends(get_settings)) -> ChatProvider | None:  # noqa: B008
    if not settings.tutor_api_key:
        return None
    return OpenAICompatibleChatProvider(settings.tutor_api_key, settings.tutor_base_url)


@router.post(
    "/learning-sessions/{learning_session_id}/tutor/messages",
    response_model=TutorMessageRead,
    status_code=201,
)
def create_tutor_message(
    learning_session_id: UUID,
    body: TutorMessageCreate,
    idempotency_key: UUID = Header(),  # noqa: B008
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
    settings: Settings = Depends(get_settings),  # noqa: B008
    provider: ChatProvider | None = Depends(get_tutor_provider),  # noqa: B008
) -> TutorMessageRead:
    return TutorMessageRead.model_validate(
        submit_message(
            session, actor, learning_session_id, body, idempotency_key, settings, provider
        )
    )


@router.get("/tutor/messages/{message_id}", response_model=TutorMessageRead)
def get_tutor_message(
    message_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> TutorMessageRead:
    return TutorMessageRead.model_validate(read_message(session, actor, message_id))


@router.get(
    "/learning-sessions/{learning_session_id}/tutor/messages",
    response_model=list[TutorMessageRead],
)
def get_tutor_messages(
    learning_session_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> list[TutorMessageRead]:
    return [
        TutorMessageRead.model_validate(item)
        for item in list_messages(session, actor, learning_session_id)
    ]

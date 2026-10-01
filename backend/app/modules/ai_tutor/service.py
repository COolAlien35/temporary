"""Quota-bound tutor message reservation and completion."""

import json
from datetime import UTC, datetime
from hashlib import sha256
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import ApiHTTPException
from app.integrations.ai.chat import ChatProvider, TutorProviderError
from app.modules.ai_tutor import debugger, guide, planner
from app.modules.ai_tutor.context import load_tutor_context
from app.modules.ai_tutor.coordinator import answer, select_role
from app.modules.ai_tutor.models import TutorMessage
from app.modules.ai_tutor.schemas import TutorMessageCreate
from app.modules.identity.public import Actor


def _request_hash(learning_session_id: UUID, body: TutorMessageCreate) -> str:
    value = {"learning_session_id": str(learning_session_id), **body.model_dump(mode="json")}
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _owner_lock(owner_id: UUID) -> int:
    digest = sha256(b"tutor-daily-quota:" + owner_id.bytes).digest()
    return int.from_bytes(digest[:8], "big", signed=True)


def submit_message(
    session: Session,
    actor: Actor,
    learning_session_id: UUID,
    body: TutorMessageCreate,
    idempotency_key: UUID,
    settings: Settings,
    provider: ChatProvider | None,
) -> TutorMessage:
    digest = _request_hash(learning_session_id, body)
    with session.begin():
        session.execute(select(func.pg_advisory_xact_lock(_owner_lock(actor.id))))
        existing = session.scalar(
            select(TutorMessage).where(
                TutorMessage.owner_id == actor.id,
                TutorMessage.idempotency_key == idempotency_key,
            )
        )
        if existing is not None:
            if existing.request_hash != digest:
                raise ApiHTTPException(409, "idempotency_conflict", "Idempotency key already used")
            if existing.status == "pending":
                raise ApiHTTPException(409, "tutor_pending", "Tutor message is still processing")
            if existing.status == "failed":
                raise ApiHTTPException(503, "tutor_failed", "Tutor message failed; use a new key")
            return existing
        context = load_tutor_context(
            session,
            actor,
            learning_session_id,
            stage=body.stage,
            run_id=body.run_id,
            circuit_id=body.circuit_id,
            circuit_revision=body.circuit_revision,
        )
        role = select_role(body.action, context)
        if (
            provider is None
            and not settings.tutor_api_key
            and not (role == "analytics_planner" and not context.history.items)
        ):
            raise ApiHTTPException(503, "tutor_not_configured", "Tutor provider is not configured")
        day_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        used = session.scalar(
            select(func.count())
            .select_from(TutorMessage)
            .where(TutorMessage.owner_id == actor.id, TutorMessage.created_at >= day_start)
        )
        if used is not None and used >= settings.tutor_daily_request_limit:
            raise ApiHTTPException(429, "tutor_daily_limit", "Daily tutor request limit reached")
        prompt_version = {
            "pedagogical_guide": guide.PROMPT_VERSION,
            "circuit_debugger": debugger.PROMPT_VERSION,
            "analytics_planner": planner.PROMPT_VERSION,
        }[role]
        message = TutorMessage(
            id=uuid4(),
            owner_id=actor.id,
            learning_session_id=learning_session_id,
            run_id=body.run_id,
            idempotency_key=idempotency_key,
            request_hash=digest,
            action=body.action,
            stage=body.stage,
            prompt=body.prompt.strip(),
            status="pending",
            role=role,
            prompt_version=prompt_version,
            model=settings.tutor_model,
            source_record_ids=list(context.source_record_ids),
        )
        session.add(message)
        session.flush()
        message_id = message.id
    try:
        reply = answer(context, body.prompt, body.action, settings, provider)
    except (TutorProviderError, ValueError) as exc:
        with session.begin():
            failed = session.get_one(TutorMessage, message_id)
            failed.status = "failed"
            failed.error_code = (
                "provider_unavailable"
                if isinstance(exc, TutorProviderError)
                else "context_too_large"
            )
            failed.completed_at = datetime.now(UTC)
        raise ApiHTTPException(503, "tutor_unavailable", "Tutor response unavailable") from None
    with session.begin():
        completed = session.get_one(TutorMessage, message_id)
        completed.status = "completed"
        completed.response_text = reply.text
        completed.role = reply.role
        completed.prompt_version = reply.prompt_version
        completed.model = reply.model
        completed.provider_called = reply.provider_called
        completed.recommendation = (
            {
                "candidate_id": reply.recommendation.candidate_id,
                "label": reply.recommendation.label,
                "href": reply.recommendation.href,
                "reason": reply.recommendation.reason,
            }
            if reply.recommendation is not None
            else None
        )
        completed.completed_at = datetime.now(UTC)
    return completed


def read_message(session: Session, actor: Actor, message_id: UUID) -> TutorMessage:
    message = session.scalar(
        select(TutorMessage).where(TutorMessage.id == message_id, TutorMessage.owner_id == actor.id)
    )
    if message is None:
        raise HTTPException(status_code=404, detail="Tutor message not found")
    return message


def list_messages(session: Session, actor: Actor, learning_session_id: UUID) -> list[TutorMessage]:
    from app.modules.predictions.public import tutor_agreement_history

    tutor_agreement_history(session, actor, learning_session_id)
    return list(
        session.scalars(
            select(TutorMessage)
            .where(
                TutorMessage.owner_id == actor.id,
                TutorMessage.learning_session_id == learning_session_id,
            )
            .order_by(TutorMessage.created_at.desc(), TutorMessage.id.desc())
            .limit(20)
        )
    )

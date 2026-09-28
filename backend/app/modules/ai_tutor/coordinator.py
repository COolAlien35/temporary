"""One-call, role-scoped tutor coordinator; no browser claims become trusted context."""

import json
from dataclasses import dataclass
from typing import Literal

from app.core.config import Settings
from app.integrations.ai.chat import ChatProvider, OpenAICompatibleChatProvider
from app.modules.ai_tutor import debugger, guide, planner
from app.modules.ai_tutor.context import TutorAction, TutorContext

TutorRole = Literal["pedagogical_guide", "circuit_debugger", "analytics_planner"]


@dataclass(frozen=True)
class TutorReply:
    text: str
    role: TutorRole
    prompt_version: str
    model: str
    source_record_ids: tuple[str, ...]
    provider_called: bool
    recommendation: planner.Recommendation | None = None


def select_role(action: TutorAction, context: TutorContext) -> TutorRole:
    if action == "plan":
        return "analytics_planner"
    if context.run_error_code is not None or action in {
        "changed",
        "unexpected",
        "optimize",
        "generate",
    }:
        return "circuit_debugger"
    if context.stage == "build" and context.circuit is not None:
        return "circuit_debugger"
    return "pedagogical_guide"


def answer(
    context: TutorContext,
    prompt: str,
    action: TutorAction,
    settings: Settings,
    provider: ChatProvider | None = None,
) -> TutorReply:
    if not 1 <= len(prompt.strip()) <= 1_000:
        raise ValueError("Tutor prompt must contain 1 to 1000 characters")
    role = select_role(action, context)
    if role == "analytics_planner" and not context.history.items:
        empty_history_recommendation = planner.fallback(context.candidates, has_history=False)
        return TutorReply(
            text=f"{empty_history_recommendation.label}: {empty_history_recommendation.reason}",
            role=role,
            prompt_version=planner.PROMPT_VERSION,
            model="deterministic-fallback",
            source_record_ids=context.source_record_ids,
            provider_called=False,
            recommendation=empty_history_recommendation,
        )
    prompt_version, instruction = {
        "pedagogical_guide": (guide.PROMPT_VERSION, guide.INSTRUCTION),
        "circuit_debugger": (debugger.PROMPT_VERSION, debugger.INSTRUCTION),
        "analytics_planner": (planner.PROMPT_VERSION, planner.INSTRUCTION),
    }[role]
    provider = provider or OpenAICompatibleChatProvider(
        settings.tutor_api_key, settings.tutor_base_url
    )
    context_data = {
        "action": action,
        "lesson_id": context.lesson_id,
        "lesson_title": context.lesson_title,
        "lesson_excerpt": context.lesson_excerpt,
        "stage": context.stage,
        "circuit": context.circuit,
        "run_id": str(context.run_id) if context.run_id is not None else None,
        "run_status": context.run_status,
        "run_error_code": context.run_error_code,
        "backend": context.backend,
        "backend_capabilities": context.backend_capabilities,
        "result_preview": context.result_preview,
        "agreement_history": context.history.model_dump(mode="json"),
        "planner_candidates": (
            [{"id": item.id, "label": item.label} for item in context.candidates]
            if role == "analytics_planner"
            else []
        ),
        "learner_prompt": prompt.strip(),
    }
    # Bounded by the context loader and schema; the guard catches unexpected source growth.
    user_content = json.dumps(context_data, separators=(",", ":"), ensure_ascii=False)
    if len(user_content) > 12_000:
        raise ValueError("Tutor context exceeds the configured bound")
    text = provider.complete(
        [
            {"role": "developer", "content": instruction},
            {"role": "user", "content": user_content},
        ],
        model=settings.tutor_model,
        max_completion_tokens=settings.tutor_max_completion_tokens,
        timeout_seconds=settings.tutor_timeout_seconds,
    )
    recommendation: planner.Recommendation | None = None
    if role == "analytics_planner":
        recommendation = planner.validated_recommendation(text, context.candidates)
        if recommendation is None:
            recommendation = planner.fallback(context.candidates, has_history=True)
        text = f"{recommendation.label}: {recommendation.reason}"
    return TutorReply(
        text=text,
        role=role,
        prompt_version=prompt_version,
        model=settings.tutor_model,
        source_record_ids=context.source_record_ids,
        provider_called=True,
        recommendation=recommendation,
    )

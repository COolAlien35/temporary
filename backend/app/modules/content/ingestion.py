"""Idempotent curriculum chunk ingestion into PostgreSQL and pgvector."""

import json
import re
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path
from typing import Any
from uuid import UUID, uuid5

from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import worker_session
from app.jobs.celery_app import celery_app

CONTENT_NAMESPACE = UUID("c16d5a86-419e-45d0-a203-9430d28f2e1f")
MIGRATION_EMBEDDING_DIM = 1536
PLACEHOLDER_UNIT_IDS = {"u4", "u5", "u6", "u7", "u8"}


def curriculum_path() -> Path:
    backend_dir = Path(__file__).resolve().parents[3]
    in_image = backend_dir / "content" / "curriculum.json"
    if in_image.exists():
        return in_image
    return backend_dir.parent / "content" / "curriculum.json"


def _tags_for(text_value: str) -> list[str]:
    return sorted(set(re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", text_value.lower())))


def curriculum_chunks(data: dict[str, Any]) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    questions_by_unit = data["questions_by_unit"]
    for unit in data["units"]:
        unit_id = unit["id"]
        quiz_tags = sorted(
            {tag for question in questions_by_unit.get(unit_id, []) for tag in question["tags"]}
        )
        is_placeholder = unit_id in PLACEHOLDER_UNIT_IDS or bool(unit.get("is_placeholder", False))
        review_status = unit.get("review_status", "pending")
        for lesson in unit["lessons"]:
            lesson_id = lesson["id"]
            lesson_tags = sorted(set(quiz_tags + _tags_for(lesson["title"])))
            for section_index, section in enumerate(lesson["sections"]):
                section_text = f"{lesson['title']} — {section['text']}"
                chunks.append(
                    _chunk(
                        source_type="lesson",
                        unit_id=unit_id,
                        lesson_id=lesson_id,
                        key=f"section:{section_index}",
                        content=section_text,
                        concept_tags=lesson_tags,
                        review_status=review_status,
                        is_placeholder=is_placeholder,
                    )
                )
            for checkpoint in lesson["checkpoints"]:
                chunks.append(
                    _chunk(
                        source_type="quiz_explanation",
                        unit_id=unit_id,
                        lesson_id=lesson_id,
                        key=f"checkpoint:{checkpoint['id']}",
                        content=(
                            f"{lesson['title']} checkpoint: {checkpoint['prompt']} "
                            f"Explanation: {checkpoint['explanation']}"
                        ),
                        concept_tags=lesson_tags,
                        review_status=review_status,
                        is_placeholder=is_placeholder,
                    )
                )
        for question in questions_by_unit.get(unit_id, []):
            lesson_id = next(
                (lesson["id"] for lesson in unit["lessons"] if lesson["id"].startswith(unit_id)),
                f"{unit_id}-core",
            )
            chunks.append(
                _chunk(
                    source_type="quiz_explanation",
                    unit_id=unit_id,
                    lesson_id=lesson_id,
                    key=f"question:{question['id']}",
                    content=(
                        f"Quiz question: {question['prompt']} "
                        f"Explanation: {question['explanation']}"
                    ),
                    concept_tags=question["tags"],
                    review_status=review_status,
                    is_placeholder=is_placeholder,
                )
            )
    for term, definition in data["glossary"].items():
        source_lessons = {
            "superposition": ("u1", "u1-quantum-foundations"),
            "oracle": ("u4", "u4-core"),
            "fidelity": ("u7", "u7-core"),
            "t1": ("u7", "u7-core"),
            "attenuation": ("u9", "u9-control-lines"),
        }
        unit_id, lesson_id = source_lessons.get(term.lower(), ("u1", "u1-quantum-foundations"))
        chunks.append(
            _chunk(
                source_type="glossary",
                unit_id=unit_id,
                lesson_id=lesson_id,
                key=f"glossary:{term}",
                content=f"{term}: {definition}",
                concept_tags=[term.lower().replace(" ", "-")],
                review_status="pending",
                is_placeholder=unit_id in PLACEHOLDER_UNIT_IDS,
            )
        )
    return chunks


def _chunk(
    *,
    source_type: str,
    unit_id: str,
    lesson_id: str,
    key: str,
    content: str,
    concept_tags: list[str],
    review_status: str,
    is_placeholder: bool,
) -> dict[str, Any]:
    return {
        "id": str(uuid5(CONTENT_NAMESPACE, f"{source_type}:{unit_id}:{lesson_id}:{key}")),
        "text": content,
        "unit_id": unit_id,
        "lesson_id": lesson_id,
        "concept_tags": sorted(set(concept_tags)),
        "source_type": source_type,
        "review_status": review_status,
        "is_placeholder": is_placeholder,
    }


def _embed_batch(chunks: list[dict[str, Any]]) -> list[list[float]]:
    settings = get_settings()
    if not settings.embedding_api_key:
        raise RuntimeError("EMBEDDING_API_KEY is required to index curriculum content")
    if settings.embedding_model != "text-embedding-3-small":
        raise RuntimeError("Migration 0006 currently supports text-embedding-3-small only")
    if settings.embedding_dim != MIGRATION_EMBEDDING_DIM:
        raise RuntimeError(
            f"EMBEDDING_DIM={settings.embedding_dim} does not match migration dimension "
            f"{MIGRATION_EMBEDDING_DIM}; changing dimensions requires "
            "a new migration and re-embedding"
        )
    request_body = json.dumps(
        {
            "model": settings.embedding_model,
            "input": [chunk["text"] for chunk in chunks],
            "dimensions": settings.embedding_dim,
        }
    ).encode()
    request = urllib.request.Request(
        f"{settings.embedding_base_url.rstrip('/')}/embeddings",
        data=request_body,
        headers={
            "Authorization": f"Bearer {settings.embedding_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            payload = json.loads(response.read())
    except urllib.error.HTTPError as error:
        error.read()
        raise RuntimeError(f"Embedding provider returned HTTP {error.code}") from error
    vectors = [row["embedding"] for row in payload["data"]]
    if len(vectors) != len(chunks) or any(
        len(vector) != settings.embedding_dim for vector in vectors
    ):
        raise RuntimeError("Embedding provider returned an unexpected vector count or dimension")
    return vectors


def ingest_curriculum() -> dict[str, Any]:
    data = json.loads(curriculum_path().read_text(encoding="utf-8"))
    chunks = curriculum_chunks(data)
    counts: Counter[tuple[str, str, bool, str]] = Counter()
    embedded: list[tuple[dict[str, Any], list[float]]] = []
    for start in range(0, len(chunks), 64):
        batch = chunks[start : start + 64]
        embedded.extend(zip(batch, _embed_batch(batch), strict=True))
    with worker_session() as session, session.begin():
        for chunk, vector in embedded:
            session.execute(
                text(
                    """
                    INSERT INTO content_chunks (
                        id, text, embedding, unit_id, lesson_id, concept_tags,
                        source_type, review_status, is_placeholder, updated_at
                    ) VALUES (
                        :id, :text, CAST(:embedding AS vector), :unit_id, :lesson_id,
                        :concept_tags, :source_type, :review_status, :is_placeholder, now()
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        text = EXCLUDED.text,
                        embedding = EXCLUDED.embedding,
                        unit_id = EXCLUDED.unit_id,
                        lesson_id = EXCLUDED.lesson_id,
                        concept_tags = EXCLUDED.concept_tags,
                        source_type = EXCLUDED.source_type,
                        review_status = EXCLUDED.review_status,
                        is_placeholder = EXCLUDED.is_placeholder,
                        updated_at = now()
                    """
                ),
                {
                    **chunk,
                    "embedding": "[" + ",".join(map(str, vector)) + "]",
                },
            )
            counts[
                (
                    chunk["unit_id"],
                    chunk["source_type"],
                    chunk["is_placeholder"],
                    chunk["review_status"],
                )
            ] += 1
    return {
        "total_chunks": len(chunks),
        "by_unit": {
            unit["id"]: sum(
                count
                for (unit_id, _source, _placeholder, _review), count in counts.items()
                if unit_id == unit["id"]
            )
            for unit in data["units"]
        },
        "by_unit_source_review": [
            {
                "unit_id": unit_id,
                "source_type": source_type,
                "review_status": review_status,
                "is_placeholder": placeholder,
                "count": count,
            }
            for (unit_id, source_type, placeholder, review_status), count in sorted(counts.items())
        ],
    }


@celery_app.task(  # type: ignore[untyped-decorator]
    name="quantumloop.content.reindex", ignore_result=False, acks_late=False
)
def reindex_curriculum() -> dict[str, Any]:
    """Embed and upsert the checked-in curriculum export."""
    return ingest_curriculum()

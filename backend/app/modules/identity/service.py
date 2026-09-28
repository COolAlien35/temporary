from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiHTTPException
from app.modules.identity.models import Profile
from app.modules.identity.repository import upsert_profile
from app.modules.identity.schemas import LearningPreferences, ProfilePatch


def get_or_create_profile(session: Session, subject: UUID, email: str) -> Profile:
    with session.begin():
        profile = upsert_profile(session, subject, email)
    return profile


def update_profile(
    session: Session, profile: Profile, patch: ProfilePatch, expected_revision: int
) -> Profile:
    with session.begin():
        profile = session.scalars(
            select(Profile)
            .where(Profile.id == profile.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        ).one()
        if profile.revision != expected_revision:
            raise ApiHTTPException(
                412,
                "revision_conflict",
                "Profile has changed; reload before saving",
                headers={"ETag": f'"rev-{profile.revision}"'},
            )
        if patch.name is not None:
            profile.name = patch.name.strip()
        if patch.preferences is not None:
            current = LearningPreferences.model_validate(profile.preferences)
            merged = current.model_copy(update=patch.preferences.model_dump(exclude_unset=True))
            profile.preferences = merged.model_dump()
        if patch.timezone is not None:
            profile.timezone = patch.timezone
        profile.revision += 1
        session.add(profile)
        session.flush()
        session.refresh(profile)
    return profile


def provision_instructor(session: Session, subject: UUID) -> bool:
    """Operator-only database action; never reachable through a user API route."""
    with session.begin():
        profile = session.scalar(
            select(Profile).where(Profile.auth_subject == subject).with_for_update()
        )
        if profile is None:
            raise LookupError("Profile not found; the user must sign in first")
        if profile.role == "instructor":
            return False
        profile.role = "instructor"
    return True

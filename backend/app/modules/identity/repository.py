from uuid import UUID, uuid4

from sqlalchemy import case, func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.modules.identity.models import Profile
from app.modules.identity.schemas import LearningPreferences


def upsert_profile(session: Session, subject: UUID, email: str) -> Profile:
    """Create on first authenticated request; never accept a client-supplied role."""
    default_name = email.split("@", 1)[0].strip()[:120] or "Learner"
    base_query = insert(Profile).values(
        id=uuid4(),
        auth_subject=subject,
        email=email,
        name=default_name,
        role="learner",
        preferences=LearningPreferences().model_dump(),
    )
    # A changed provider email is a visible profile edit and invalidates prior ETags.
    changed_email = Profile.email != base_query.excluded.email
    query = base_query.on_conflict_do_update(
        index_elements=[Profile.auth_subject],
        set_={
            "email": base_query.excluded.email,
            "revision": case((changed_email, Profile.revision + 1), else_=Profile.revision),
            "updated_at": case((changed_email, func.now()), else_=Profile.updated_at),
        },
    ).returning(Profile.id)
    profile_id = session.scalar(query)
    assert profile_id is not None
    return session.get_one(Profile, profile_id, populate_existing=True)

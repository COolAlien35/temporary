import re

from fastapi import APIRouter, Depends, Header, Response
from sqlalchemy.orm import Session

from app.core.errors import ApiHTTPException
from app.db.session import get_session
from app.modules.identity.models import Profile
from app.modules.identity.public import get_current_profile
from app.modules.identity.schemas import ProfilePatch, ProfileRead
from app.modules.identity.service import update_profile

router = APIRouter(tags=["identity"])


@router.get("/me", response_model=ProfileRead)
def read_me(
    response: Response,
    profile: Profile = Depends(get_current_profile),  # noqa: B008
) -> Profile:
    response.headers["ETag"] = f'"rev-{profile.revision}"'
    return profile


@router.patch("/me", response_model=ProfileRead)
def patch_me(
    patch: ProfilePatch,
    response: Response,
    if_match: str | None = Header(default=None),
    profile: Profile = Depends(get_current_profile),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> Profile:
    if if_match is None:
        raise ApiHTTPException(428, "precondition_required", "If-Match header required")
    match = re.fullmatch(r'"rev-([1-9][0-9]*)"', if_match)
    if match is None:
        raise ApiHTTPException(400, "invalid_precondition", "Invalid If-Match header")
    updated = update_profile(session, profile, patch, int(match.group(1)))
    response.headers["ETag"] = f'"rev-{updated.revision}"'
    return updated

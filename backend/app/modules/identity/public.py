from dataclasses import dataclass
from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError, PyJWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.modules.identity.models import Profile
from app.modules.identity.service import get_or_create_profile

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class IdentityClaims:
    subject: UUID
    email: str


@dataclass(frozen=True)
class Actor:
    id: UUID
    email: str
    role: str


@dataclass(frozen=True)
class ProfileSummary:
    id: UUID
    name: str
    email: str
    role: str


def get_profile_summary(session: Session, profile_id: UUID) -> ProfileSummary | None:
    profile = session.get(Profile, profile_id)
    if profile is None:
        return None
    return ProfileSummary(profile.id, profile.name, profile.email, profile.role)


def get_profile_summaries(session: Session, profile_ids: list[UUID]) -> dict[UUID, ProfileSummary]:
    if not profile_ids:
        return {}
    profiles = session.scalars(select(Profile).where(Profile.id.in_(profile_ids))).all()
    return {
        profile.id: ProfileSummary(profile.id, profile.name, profile.email, profile.role)
        for profile in profiles
    }


@lru_cache(maxsize=16)
def jwks_client(issuer: str) -> PyJWKClient:
    return PyJWKClient(
        f"{issuer}/.well-known/jwks.json", cache_jwk_set=True, lifespan=300, timeout=3
    )


def verify_access_token(token: str, settings: Settings) -> IdentityClaims:
    if not settings.auth_issuer:
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    try:
        key = jwks_client(settings.auth_issuer).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            key.key,
            algorithms=["RS256", "ES256"],
            audience=settings.auth_audience,
            issuer=settings.auth_issuer,
            leeway=30,
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
        )
        if claims.get("role") != "authenticated" or claims.get("is_anonymous") is True:
            raise ValueError("Expected a permanent authenticated user")
        subject = UUID(str(claims["sub"]))
        email = claims.get("email")
        if not isinstance(email, str) or not (3 <= len(email) <= 320) or "@" not in email:
            raise ValueError("Expected an email claim")
    except PyJWKClientConnectionError:
        raise HTTPException(status_code=503, detail="Authentication provider unavailable") from None
    except (PyJWTError, ValueError, TypeError, KeyError):
        raise HTTPException(
            status_code=401, detail="Invalid access token", headers={"WWW-Authenticate": "Bearer"}
        ) from None
    return IdentityClaims(subject=subject, email=email.strip().lower())


def get_claims(
    credential: HTTPAuthorizationCredentials | None = Depends(bearer),  # noqa: B008
    settings: Settings = Depends(get_settings),  # noqa: B008
) -> IdentityClaims:
    if credential is None:
        raise HTTPException(
            status_code=401, detail="Bearer token required", headers={"WWW-Authenticate": "Bearer"}
        )
    return verify_access_token(credential.credentials, settings)


def get_current_profile(
    claims: IdentityClaims = Depends(get_claims),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> Profile:
    return get_or_create_profile(session, claims.subject, claims.email)


def get_actor(profile: Profile = Depends(get_current_profile)) -> Actor:  # noqa: B008
    return Actor(id=profile.id, email=profile.email, role=profile.role)

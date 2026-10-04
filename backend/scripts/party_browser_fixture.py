"""Local browser acceptance fixture. Never imported by the production application."""

import json
import signal
import threading
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import uvicorn
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_engine
from app.main import create_app
from app.modules.ai_tutor.models import TutorMessage
from app.modules.ai_tutor.router import get_tutor_provider
from app.modules.circuits.models import Circuit
from app.modules.experiments.models import ExperimentRun
from app.modules.identity.models import Profile
from app.modules.identity.public import jwks_client
from app.modules.jobs.dispatcher import dispatch_once
from app.modules.jobs.models import Job, JobOutbox
from app.modules.parties.models import Party
from app.modules.predictions.models import LearningSession

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
jwk = json.loads(RSAAlgorithm.to_jwk(key.public_key()))
jwk.update(kid="browser-key", alg="RS256", use="sig")
jwt.PyJWKClient.fetch_data = lambda self: {"keys": [jwk]}
jwks_client.cache_clear()
issuer = "https://provider.example.test/auth/v1"
settings = get_settings().model_copy(
    update={"auth_issuer": issuer, "cors_origins": ["http://127.0.0.1:3102"]}
)
subjects = [uuid4(), uuid4(), uuid4()]
now = datetime.now(UTC)
identities = [
    {
        "subject": str(subject),
        "email": f"browser{i}@example.test",
        "token": jwt.encode(
            {
                "sub": str(subject),
                "email": f"browser{i}@example.test",
                "role": "authenticated",
                "iss": issuer,
                "aud": "authenticated",
                "iat": now,
                "exp": now + timedelta(hours=1),
            },
            key,
            algorithm="RS256",
            headers={"kid": "browser-key"},
        ),
    }
    for i, subject in enumerate(subjects)
]
application = create_app(settings)


@application.get("/browser-fixture")
def fixture():
    return identities


class FixtureTutor:
    def complete(self, messages, **kwargs):
        assert any(
            '"type": "H"' in item["content"] or '"type":"H"' in item["content"] for item in messages
        )
        return "This saved Hadamard gate creates equal measurement probabilities."


application.dependency_overrides[get_tutor_provider] = lambda: FixtureTutor()
second_application = create_app(settings)
second_application.dependency_overrides[get_tutor_provider] = lambda: FixtureTutor()
servers = [
    uvicorn.Server(uvicorn.Config(application, host="127.0.0.1", port=8011, log_level="error")),
    uvicorn.Server(
        uvicorn.Config(second_application, host="127.0.0.1", port=8012, log_level="error")
    ),
]
threads = [threading.Thread(target=server.run, daemon=True) for server in servers]
for thread in threads:
    thread.start()
stop = threading.Event()
signal.signal(signal.SIGTERM, lambda *_: stop.set())
signal.signal(signal.SIGINT, lambda *_: stop.set())
try:
    while not stop.wait(1):
        dispatch_once()
        if any(not thread.is_alive() for thread in threads):
            raise RuntimeError("Fixture API stopped")
finally:
    for server in servers:
        server.should_exit = True
    for thread in threads:
        thread.join(10)
    with Session(get_engine()) as session, session.begin():
        profiles = list(session.scalars(select(Profile).where(Profile.auth_subject.in_(subjects))))
        ids = [profile.id for profile in profiles]
        runs = list(session.scalars(select(Job.id).where(Job.owner_id.in_(ids))))
        session.execute(delete(TutorMessage).where(TutorMessage.owner_id.in_(ids)))
        session.execute(delete(LearningSession).where(LearningSession.learner_id.in_(ids)))
        session.execute(delete(ExperimentRun).where(ExperimentRun.owner_id.in_(ids)))
        session.execute(delete(JobOutbox).where(JobOutbox.job_id.in_(runs)))
        session.execute(delete(Job).where(Job.owner_id.in_(ids)))
        session.execute(delete(Circuit).where(Circuit.owner_id.in_(ids)))
        session.execute(delete(Party).where(Party.owner_id.in_(ids)))
        session.execute(delete(Profile).where(Profile.id.in_(ids)))

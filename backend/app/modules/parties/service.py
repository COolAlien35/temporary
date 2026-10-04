import hashlib
import json
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ApiHTTPException
from app.modules.circuits.public import copy_snapshot
from app.modules.circuits.schemas import CircuitDraft, CircuitSnapshot
from app.modules.identity.public import Actor, get_profile_summaries
from app.modules.parties import repository
from app.modules.parties.hardware import apply_hardware
from app.modules.parties.models import FrozenCircuit, Invitation, Membership, Party, PartyEvent
from app.modules.parties.schemas import InviteCreate, PartyCreate, RoomAction


def digest(value: object) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def authorize(
    session: Session, actor: Actor, party_id: UUID, owner: bool = False
) -> tuple[Party, Membership]:
    party = repository.locked_party(session, party_id)
    member = session.get(Membership, (party_id, actor.id))
    if party is None or member is None or not member.active or party.closed:
        raise ApiHTTPException(404, "party_unavailable", "Party is unavailable")
    if owner and member.role != "owner":
        raise ApiHTTPException(403, "owner_required", "Only the party owner can do this")
    return party, member


def record(
    session: Session,
    party: Party,
    actor: Actor,
    kind: str,
    payload: dict[str, object],
    event_id: UUID | None = None,
    request_hash: str = "",
) -> PartyEvent:
    party.revision += 1
    event = PartyEvent(
        party_id=party.id,
        event_id=event_id or uuid4(),
        actor_id=actor.id,
        revision=party.revision,
        kind=kind,
        payload=payload,
        request_hash=request_hash,
    )
    session.add(event)
    session.flush()
    return event


def event_read(event: PartyEvent) -> dict[str, object]:
    return {
        "event_id": str(event.event_id),
        "party_id": str(event.party_id),
        "actor_id": str(event.actor_id),
        "revision": event.revision,
        "kind": event.kind,
        "payload": event.payload,
        "created_at": event.created_at.isoformat(),
    }


def snapshot_read(session: Session, party: Party, member: Membership) -> dict[str, object]:
    memberships = repository.members(session, party.id)
    profiles = get_profile_summaries(session, [m.profile_id for m in memberships])
    history = list(
        session.scalars(
            select(PartyEvent)
            .where(PartyEvent.party_id == party.id, PartyEvent.kind == "chat")
            .order_by(PartyEvent.revision.desc())
            .limit(50)
        )
    )
    return {
        "id": str(party.id),
        "kind": party.kind,
        "circuit_id": str(party.id),
        "revision": party.revision,
        "snapshot": party.snapshot,
        "capacity": party.capacity,
        "role": member.role,
        "members": [
            {"id": str(m.profile_id), "name": profiles[m.profile_id].name, "role": m.role}
            for m in memberships
        ],
        "chat": [event_read(e) for e in reversed(history)],
    }


def create(session: Session, actor: Actor, body: PartyCreate, key: UUID) -> dict[str, object]:
    with session.begin():
        # Serialize per-user creation/idempotency across replicas without private identity tables.
        session.execute(
            select(
                func.pg_advisory_xact_lock(int.from_bytes(actor.id.bytes[:8], "big", signed=True))
            )
        )
        old = session.scalar(
            select(Party).where(Party.owner_id == actor.id, Party.create_key == key)
        )
        # Preserve the original circuit create hashes across this schema expansion.
        request_hash = digest(
            {"capacity": body.capacity, "circuit": body.circuit.model_dump(mode="json")}
            if body.circuit
            else body.model_dump(mode="json", exclude_none=True)
        )
        if old:
            if old.request_hash != request_hash:
                raise ApiHTTPException(
                    409, "idempotency_conflict", "Key was used with another request"
                )
            old_member = session.get(Membership, (old.id, actor.id))
            if old_member is None or old.closed:
                raise ApiHTTPException(409, "party_closed", "Party is closed")
            return snapshot_read(session, old, old_member)
        count = (
            session.scalar(
                select(func.count())
                .select_from(Party)
                .where(Party.owner_id == actor.id, Party.closed.is_(False))
            )
            or 0
        )
        if count >= 10:
            raise ApiHTTPException(429, "party_limit", "Close a party before creating another")
        document = (
            body.circuit.canonical_snapshot()
            if body.circuit
            else body.design.model_dump(mode="json", exclude_none=True)
            if body.design
            else {}
        )
        party = Party(
            owner_id=actor.id,
            create_key=key,
            request_hash=request_hash,
            capacity=body.capacity,
            kind=body.kind,
            snapshot=document,
        )
        session.add(party)
        session.flush()
        member = Membership(party_id=party.id, profile_id=actor.id, role="owner")
        session.add(member)
        session.flush()
        return snapshot_read(session, party, member)


def read(
    session: Session, actor: Actor, party_id: UUID, after: int | None = None
) -> dict[str, object]:
    with session.begin():
        party, member = authorize(session, actor, party_id)
        result = snapshot_read(session, party, member)
        if after is not None:
            history = repository.events(session, party.id, after, 101)
            result["events"] = [event_read(e) for e in history[:100]] if len(history) <= 100 else []
            result["replay_complete"] = after <= party.revision and len(history) <= 100
        return result


def invite(session: Session, actor: Actor, party_id: UUID, body: InviteCreate) -> dict[str, object]:
    with session.begin():
        authorize(session, actor, party_id, owner=True)
        count = (
            session.scalar(
                select(func.count())
                .select_from(Invitation)
                .where(
                    Invitation.party_id == party_id,
                    Invitation.revoked.is_(False),
                    Invitation.expires_at > datetime.now(UTC),
                )
            )
            or 0
        )
        if count >= 20:
            raise ApiHTTPException(
                429, "invite_limit", "Revoke an invitation before creating another"
            )
        token = secrets.token_urlsafe(32)
        invitation = Invitation(
            party_id=party_id,
            token_hash=digest(token),
            role=body.role,
            email=body.email.strip().lower() if body.email else None,
            expires_at=datetime.now(UTC) + timedelta(hours=body.hours),
        )
        session.add(invitation)
        session.flush()
        return {
            "id": str(invitation.id),
            "token": token,
            "expires_at": invitation.expires_at.isoformat(),
        }


def accept(session: Session, actor: Actor, token: str) -> dict[str, object]:
    with session.begin():
        invitation = session.scalar(
            select(Invitation).where(Invitation.token_hash == digest(token))
        )
        if invitation is None:
            raise ApiHTTPException(404, "invite_unavailable", "Invitation is unavailable")
        party = repository.locked_party(session, invitation.party_id)
        session.refresh(invitation)
        if (
            party is None
            or party.closed
            or invitation.revoked
            or invitation.expires_at <= datetime.now(UTC)
            or (invitation.email and invitation.email != actor.email)
        ):
            raise ApiHTTPException(404, "invite_unavailable", "Invitation is unavailable")
        member = session.get(Membership, (party.id, actor.id))
        if member and member.active:
            return snapshot_read(session, party, member)
        if member:
            raise ApiHTTPException(403, "membership_revoked", "Your membership was revoked")
        if len(repository.members(session, party.id)) >= party.capacity:
            raise ApiHTTPException(409, "party_full", "Party is full")
        member = Membership(party_id=party.id, profile_id=actor.id, role=invitation.role)
        session.add(member)
        record(session, party, actor, "member", {"profile_id": str(actor.id), "active": True})
        return snapshot_read(session, party, member)


def revoke_invite(session: Session, actor: Actor, party_id: UUID, invite_id: UUID) -> None:
    with session.begin():
        authorize(session, actor, party_id, owner=True)
        invitation = session.get(Invitation, invite_id)
        if invitation is None or invitation.party_id != party_id:
            raise ApiHTTPException(404, "invite_unavailable", "Invitation is unavailable")
        invitation.revoked = True


def remove(session: Session, actor: Actor, party_id: UUID, profile_id: UUID) -> None:
    with session.begin():
        party, current = authorize(session, actor, party_id)
        if actor.id != profile_id and current.role != "owner":
            raise ApiHTTPException(403, "owner_required", "Only the party owner can remove others")
        member = session.get(Membership, (party_id, profile_id))
        if member is None or member.role == "owner":
            raise ApiHTTPException(409, "invalid_member", "Owner must close the party instead")
        member.active = False
        record(session, party, actor, "member", {"profile_id": str(profile_id), "active": False})


def close(session: Session, actor: Actor, party_id: UUID) -> None:
    with session.begin():
        party, _ = authorize(session, actor, party_id, owner=True)
        party.closed = True
        record(session, party, actor, "closed", {})


def apply_operation(snapshot: dict[str, object], action: RoomAction) -> dict[str, object]:
    draft = CircuitDraft.model_validate(
        {k: v for k, v in snapshot.items() if k != "schema_version"}
    )
    if action.kind == "upsert" and action.gate:
        draft.gates = [g for g in draft.gates if g.id != action.gate.id] + [action.gate]
    elif action.kind == "delete":
        draft.gates = [g for g in draft.gates if g.id != action.gate_id]
    elif action.kind == "settings":
        draft.name = action.name if action.name is not None else draft.name
        draft.qubits = action.qubits if action.qubits is not None else draft.qubits
    return CircuitDraft.model_validate(draft.model_dump()).canonical_snapshot()


def act(session: Session, actor: Actor, party_id: UUID, action: RoomAction) -> dict[str, object]:
    with session.begin():
        session.execute(
            select(
                func.pg_advisory_xact_lock(int.from_bytes(actor.id.bytes[:8], "big", signed=True))
            )
        )
        party, member = authorize(session, actor, party_id)
        if action.circuit_id != party.id:
            raise ApiHTTPException(422, "wrong_circuit", "Circuit does not belong to this party")
        if action.kind != "chat" and (action.kind == "hardware") != (party.kind == "hardware"):
            raise ApiHTTPException(422, "wrong_document", "Action does not match the party kind")
        if member.role == "view" or (member.role == "comment" and action.kind != "chat"):
            raise ApiHTTPException(
                403, "access_denied", "Your party role does not permit this action"
            )
        request_hash = digest(
            action.model_dump(mode="json", exclude={"changes"} if action.changes is None else set())
        )
        previous = session.scalar(
            select(PartyEvent).where(
                PartyEvent.party_id == party.id, PartyEvent.event_id == action.event_id
            )
        )
        if previous:
            if previous.actor_id != actor.id or previous.request_hash != request_hash:
                raise ApiHTTPException(409, "idempotency_conflict", "Event ID was already used")
            return event_read(previous)
        if action.base_revision > party.revision or (
            (action.kind == "settings" or (action.changes and action.changes.meta))
            and action.base_revision != party.revision
        ):
            raise ApiHTTPException(
                409, "revision_conflict", "Reload the party before changing its settings"
            )
        recent = (
            session.scalar(
                select(func.count())
                .select_from(PartyEvent)
                .where(
                    PartyEvent.actor_id == actor.id,
                    PartyEvent.created_at > datetime.now(UTC) - timedelta(minutes=1),
                )
            )
            or 0
        )
        if recent >= 120:
            raise ApiHTTPException(429, "action_limit", "Too many party actions; try again shortly")
        try:
            if action.kind != "chat":
                party.snapshot = (
                    apply_hardware(party.snapshot, action.changes)
                    if action.changes
                    else apply_operation(party.snapshot, action)
                )
        except ValidationError:
            raise ApiHTTPException(
                422, "invalid_document", "Edit would create an invalid party document"
            ) from None
        event = record(
            session,
            party,
            actor,
            action.kind,
            action.model_dump(mode="json", exclude_none=True),
            action.event_id,
            request_hash,
        )
        return event_read(event)


def freeze(
    session: Session, actor: Actor, party_id: UUID, revision: int, key: UUID
) -> dict[str, object]:
    """Freeze authorized state before copying; a crash/retry reuses the immutable source."""
    with session.begin():
        session.execute(
            select(
                func.pg_advisory_xact_lock(int.from_bytes(actor.id.bytes[:8], "big", signed=True))
            )
        )
        party, _ = authorize(session, actor, party_id)
        if party.kind != "circuit":
            raise ApiHTTPException(
                422, "wrong_document", "Hardware wiring cannot be executed as a quantum circuit"
            )
        frozen = session.scalar(
            select(FrozenCircuit).where(
                FrozenCircuit.owner_id == actor.id, FrozenCircuit.idempotency_key == key
            )
        )
        if frozen:
            if frozen.party_id != party.id or frozen.party_revision != revision:
                raise ApiHTTPException(
                    409, "idempotency_conflict", "Copy key was used for another revision"
                )
        else:
            if party.revision != revision:
                raise ApiHTTPException(
                    409, "revision_conflict", "Party changed; reload before saving"
                )
            frozen = FrozenCircuit(
                party_id=party.id,
                party_revision=party.revision,
                owner_id=actor.id,
                idempotency_key=key,
                snapshot=party.snapshot,
            )
            session.add(frozen)
            session.flush()
        saved_snapshot = CircuitSnapshot.model_validate(frozen.snapshot)
    copied = copy_snapshot(session, actor, saved_snapshot, key)
    return {
        "party_id": str(party_id),
        "party_revision": revision,
        "circuit": copied.model_dump(mode="json", exclude_none=True),
    }

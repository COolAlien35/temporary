"""WebSocket-only Socket.IO with Redis hints, durable replay, and per-action JWT verification."""

import asyncio
import json
import logging
import time
from contextlib import suppress
from typing import Any
from uuid import UUID

import jwt
import socketio
from fastapi import HTTPException
from pydantic import ValidationError
from redis import Redis as SyncRedis
from redis.asyncio import Redis
from sqlalchemy import Engine
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.config import Settings
from app.modules.identity.public import Actor, get_current_profile, verify_access_token
from app.modules.parties import public
from app.modules.parties.schemas import RoomAction

logger = logging.getLogger(__name__)


class Realtime:
    def __init__(self, settings: Settings, engine: Engine) -> None:
        self.settings = settings
        self.engine = engine
        self.redis: Redis = Redis.from_url(settings.cache_url, decode_responses=True)
        self.publisher = socketio.RedisManager(
            settings.cache_url, channel="ql-parties", write_only=True
        )
        # Propagate publish failures so the durable outbox can retry.
        self.publisher._publish = self.publish
        self.sio = socketio.AsyncServer(
            async_mode="asgi",
            client_manager=socketio.AsyncRedisManager(settings.cache_url, channel="ql-parties"),
            cors_allowed_origins=settings.cors_origins,
            transports=["websocket"],
            max_http_buffer_size=80000,
        )
        self.connections: dict[str, tuple[str, float, UUID | None]] = {}
        self.actors: dict[str, Actor] = {}
        self.task: asyncio.Task[None] | None = None
        self.sio.on("connect", self.connect)
        self.sio.on("disconnect", self.disconnect)
        self.sio.on("join", self.join)
        self.sio.on("action", self.action)
        self.sio.on("heartbeat", self.heartbeat)

    def actor(self, token: str) -> Actor:
        claims = verify_access_token(token, self.settings)
        # Strict expiry for established sockets, even within HTTP clock leeway.
        expiry = float(jwt.decode(token, options={"verify_signature": False})["exp"])
        if expiry <= time.time():
            raise HTTPException(401, "Expired access token")
        with Session(self.engine, expire_on_commit=False) as session:
            profile = get_current_profile(claims, session)
            return Actor(profile.id, profile.email, profile.role)

    async def connect(self, sid: str, environ: dict[str, Any], auth: Any) -> bool:
        if not isinstance(auth, dict) or not isinstance(auth.get("token"), str):
            return False
        token = auth["token"]
        try:
            actor = await run_in_threadpool(self.actor, token)
            expiry = float(jwt.decode(token, options={"verify_signature": False})["exp"])
        except (HTTPException, ValueError, KeyError, jwt.PyJWTError):
            return False
        self.connections[sid] = (token, expiry, None)
        self.actors[sid] = actor
        await self.sio.enter_room(sid, f"profile:{actor.id}")
        return True

    async def disconnect(self, sid: str, reason: str = "") -> None:
        self.actors.pop(sid, None)
        connection = self.connections.pop(sid, None)
        if connection and connection[2]:
            await self.redis.delete(f"ql:presence:{connection[2]}:{sid}")

    def execute(
        self,
        token: str,
        party_id: UUID,
        operation: RoomAction | None = None,
        after: int | None = None,
    ) -> dict[str, object]:
        actor = self.actor(token)
        with Session(self.engine, expire_on_commit=False) as session:
            if operation:
                return public.act(session, actor, party_id, operation)
            return public.read(session, actor, party_id, after)

    async def join(self, sid: str, data: Any) -> dict[str, object]:
        try:
            token, expiry, old_party = self.connections[sid]
            party_id = UUID(data["party_id"])
            after = int(data.get("after", 0))
            if after < 0:
                raise ValueError("Invalid revision")
            result = await run_in_threadpool(self.execute, token, party_id, None, after)
            if old_party:
                await self.redis.delete(f"ql:presence:{old_party}:{sid}")
            self.connections[sid] = (token, expiry, party_id)
            await self.redis.set(f"ql:presence:{party_id}:{sid}", str(result["role"]), ex=30)
            return {"ok": True, "party": result}
        except (HTTPException, ValueError, KeyError, TypeError) as exc:
            return self.error(exc)

    async def action(self, sid: str, data: Any) -> dict[str, object]:
        try:
            token, _, party_id = self.connections[sid]
            if party_id is None:
                raise ValueError("Join a party first")
            operation = RoomAction.model_validate(data)
            result = await run_in_threadpool(self.execute, token, party_id, operation)
            return {"ok": True, "event": result}
        except (HTTPException, ValidationError, ValueError, KeyError, TypeError) as exc:
            return self.error(exc)

    async def heartbeat(self, sid: str, data: Any = None) -> dict[str, object]:
        result = await self.join(
            sid, {"party_id": str(self.connections.get(sid, (None, None, None))[2])}
        )
        if not result.get("ok"):
            await self.sio.disconnect(sid)
            return result
        party_id = self.connections[sid][2]
        keys = [
            key async for key in self.redis.scan_iter(match=f"ql:presence:{party_id}:*", count=100)
        ]
        return {"ok": True, "connections": len(keys)}

    @staticmethod
    def error(exc: Exception) -> dict[str, object]:
        return {
            "ok": False,
            "error": {
                "status": exc.status_code if isinstance(exc, HTTPException) else 422,
                "message": str(exc.detail)
                if isinstance(exc, HTTPException)
                else "Invalid room action",
            },
        }

    def publish(self, data: dict[str, object]) -> int:
        with SyncRedis.from_url(
            self.settings.cache_url, socket_timeout=2, socket_connect_timeout=2
        ) as client:
            return int(client.publish("ql-parties", json.dumps(data)))

    def dispatch(self) -> None:
        def emit(event: str, data: dict[str, object], room: str) -> None:
            self.publisher.emit(event, data, room=room)

        with Session(self.engine, expire_on_commit=False) as session:
            public.deliver_pending(session, emit)

    def check(self, actor: Actor, party_id: UUID) -> None:
        with Session(self.engine, expire_on_commit=False) as session:
            public.check_membership(session, actor, party_id)

    async def loop(self) -> None:
        while True:
            try:
                for sid, (_, expiry, party_id) in list(self.connections.items()):
                    if expiry <= time.time():
                        await self.sio.disconnect(sid)
                    elif party_id and sid in self.actors:
                        try:
                            await run_in_threadpool(self.check, self.actors[sid], party_id)
                        except HTTPException:
                            await self.sio.disconnect(sid)
                await run_in_threadpool(self.dispatch)
            except Exception:
                logger.warning("party_notification_dispatch_unavailable")
            await asyncio.sleep(1)

    async def start(self) -> None:
        self.task = asyncio.create_task(self.loop())

    async def stop(self) -> None:
        if self.task:
            self.task.cancel()
            with suppress(asyncio.CancelledError):
                await self.task
        await self.redis.aclose()
        await self.sio.shutdown()

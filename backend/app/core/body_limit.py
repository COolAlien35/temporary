"""Bound request bodies before route parsing, including chunked requests."""

from collections.abc import Callable

from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send


class RequestBodyLimitMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        max_bytes: int,
        error_response: Callable[[Request, int, str, str], Response],
    ) -> None:
        self.app = app
        self.max_bytes = max_bytes
        self.error_response = error_response

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def reject() -> None:
            response = self.error_response(
                Request(scope, receive), 413, "request_too_large", "Request body is too large"
            )
            await response(scope, receive, send)

        headers = dict(scope["headers"])
        declared = headers.get(b"content-length")
        if declared is not None:
            try:
                if int(declared) > self.max_bytes:
                    await reject()
                    return
            except ValueError:
                pass

        buffered: list[Message] = []
        total = 0
        while True:
            message = await receive()
            if message["type"] != "http.request":
                buffered.append(message)
                break
            total += len(message.get("body", b""))
            if total > self.max_bytes:
                await reject()
                return
            buffered.append(message)
            if not message.get("more_body", False):
                break

        async def replay() -> Message:
            if buffered:
                return buffered.pop(0)
            return await receive()

        await self.app(scope, replay, send)

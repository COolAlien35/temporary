"""Bounded OpenAI-compatible Chat Completions adapter."""

import json
import urllib.error
import urllib.request
from typing import Protocol


class TutorProviderError(RuntimeError):
    """The provider did not return a usable tutor response."""


class ChatProvider(Protocol):
    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
        max_completion_tokens: int,
        timeout_seconds: int,
    ) -> str: ...


class OpenAICompatibleChatProvider:
    def __init__(self, api_key: str, base_url: str) -> None:
        if not api_key:
            raise TutorProviderError("Tutor provider is not configured")
        if not base_url.startswith("https://"):
            raise TutorProviderError("Tutor provider URL must use HTTPS")
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")

    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        model: str,
        max_completion_tokens: int,
        timeout_seconds: int,
    ) -> str:
        payload = json.dumps(
            {
                "model": model,
                "messages": messages,
                "max_completion_tokens": max_completion_tokens,
                "stream": False,
                "store": False,
                "n": 1,
            },
            separators=(",", ":"),
        ).encode()
        request = urllib.request.Request(
            f"{self._base_url}/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
                body = json.load(response)
            content = body["choices"][0]["message"]["content"]
            if not isinstance(content, str) or not content.strip() or len(content) > 8_000:
                raise ValueError("Invalid completion content")
            return content.strip()
        except (urllib.error.URLError, TimeoutError, ValueError, KeyError, IndexError, TypeError):
            raise TutorProviderError(
                "Tutor provider unavailable or returned invalid content"
            ) from None

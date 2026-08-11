"""Armazenamento temporario em memoria para os modelos .glb gerados.

Permite expor cada modelo gerado por /convert atraves de uma URL publica
(GET /models/{id}.glb), para que visualizadores externos (como o
https://gltf-viewer.donmccurdy.com/) consigam buscar o arquivo via
`fetch` sem exigir upload manual.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from threading import Lock

TTL_SECONDS = 30 * 60


@dataclass
class _Entry:
    data: bytes
    expires_at: float


class ModelStore:
    def __init__(self, ttl_seconds: int = TTL_SECONDS) -> None:
        self._ttl = ttl_seconds
        self._entries: dict[str, _Entry] = {}
        self._lock = Lock()

    def save(self, data: bytes) -> str:
        model_id = uuid.uuid4().hex
        expires_at = time.monotonic() + self._ttl
        with self._lock:
            self._purge_expired()
            self._entries[model_id] = _Entry(data=data, expires_at=expires_at)
        return model_id

    def get(self, model_id: str) -> bytes | None:
        with self._lock:
            entry = self._entries.get(model_id)
            if entry is None:
                return None
            if entry.expires_at < time.monotonic():
                del self._entries[model_id]
                return None
            return entry.data

    def _purge_expired(self) -> None:
        now = time.monotonic()
        expired = [key for key, entry in self._entries.items() if entry.expires_at < now]
        for key in expired:
            del self._entries[key]


store = ModelStore()

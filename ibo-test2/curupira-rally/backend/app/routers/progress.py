"""Rota para registro (best-effort) de progresso/pontuacao do participante."""
from __future__ import annotations

import json

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.db import get_connection

router = APIRouter(prefix="/api", tags=["progresso"])


class ProgressIn(BaseModel):
    participant_id: str = Field(..., min_length=1, max_length=128)
    posto_id: str = Field(..., min_length=1, max_length=32)
    pontuacao: int = Field(..., ge=0)
    respostas: dict = Field(default_factory=dict)


@router.post("/progress", status_code=201)
def save_progress(payload: ProgressIn) -> dict:
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO progress (participant_id, posto_id, pontuacao, respostas_json) VALUES (?, ?, ?, ?)",
            (payload.participant_id, payload.posto_id, payload.pontuacao, json.dumps(payload.respostas)),
        )
    return {"status": "ok"}


@router.get("/progress/{participant_id}")
def get_progress(participant_id: str) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT posto_id, pontuacao, criado_em FROM progress WHERE participant_id = ? ORDER BY criado_em",
            (participant_id,),
        ).fetchall()
    return [dict(row) for row in rows]

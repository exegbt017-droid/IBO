"""Rotas de conteudo: postos e banco de animais."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

CONTENT_DIR = Path(__file__).parent.parent / "content"
POSTOS_DIR = CONTENT_DIR / "postos"
ANIMALS_FILE = CONTENT_DIR / "animals.json"

router = APIRouter(prefix="/api", tags=["conteudo"])


def _load_json(path: Path) -> dict | list:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


@router.get("/postos/{posto_id}")
def get_posto(posto_id: str) -> dict:
    path = POSTOS_DIR / f"posto_{posto_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Posto '{posto_id}' nao encontrado.")

    posto = _load_json(path)

    animals_by_id = {a["id"]: a for a in _load_json(ANIMALS_FILE)}
    for entry in posto.get("animais", []):
        animal = animals_by_id.get(entry["animal_id"])
        if animal is None:
            raise HTTPException(
                status_code=500,
                detail=f"Animal '{entry['animal_id']}' referenciado no posto nao existe em animals.json.",
            )
        entry["animal"] = animal

    return posto


@router.get("/animals")
def list_animals() -> list:
    return _load_json(ANIMALS_FILE)

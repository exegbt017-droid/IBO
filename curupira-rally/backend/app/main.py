"""Curupira Rally - backend de conteudo, progresso e interface web.

Um unico processo serve tanto a API quanto a interface ja construida
(frontend/ -> app/static/web/), para que rodar o projeto seja apenas
subir o uvicorn em uma unica porta.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.db import init_db
from app.routers import postos, progress

STATIC_DIR = Path(__file__).parent / "static"
ASSETS_DIR = STATIC_DIR / "assets"
WEB_DIR = STATIC_DIR / "web"
INDEX_FILE = WEB_DIR / "index.html"


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Curupira Rally", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(postos.router)
app.include_router(progress.router)

ASSETS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

if WEB_DIR.is_dir():
    app.mount("/app", StaticFiles(directory=WEB_DIR), name="web")


def _serve_index() -> FileResponse:
    if not INDEX_FILE.exists():
        raise HTTPException(
            status_code=503,
            detail=(
                "Interface ainda nao construida. Rode 'npm install && npm run build' "
                "em curupira-rally/frontend, ou use o script start.sh."
            ),
        )
    return FileResponse(INDEX_FILE)


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return _serve_index()


@app.get("/posto/{posto_id}", include_in_schema=False)
def posto_page(posto_id: str) -> FileResponse:
    """Rota que o QR Code abre. O ID e resolvido pelo front a partir da URL."""
    return _serve_index()

"""API HTTP para converter imagens 2D em modelos 3D (glTF binario / .glb)."""
from __future__ import annotations

import io
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError

from app.mesh import MAX_RESOLUTION, MIN_RESOLUTION, MeshOptions, image_to_glb

ACCEPTED_CONTENT_TYPES = {"image/jpeg", "image/png"}

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(
    title="IBO - Conversor 2D para 3D",
    description="Converte uma imagem 2D (JPEG/PNG) em uma malha 3D texturizada (glTF/GLB) usando um heightmap de luminancia.",
    version="1.0.0",
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def viewer() -> FileResponse:
    """Serve o visualizador glTF: recebe um JPEG/PNG e mostra o modelo 3D gerado."""
    return FileResponse(STATIC_DIR / "index.html")


@app.post(
    "/convert",
    responses={200: {"content": {"model/gltf-binary": {}}}},
    summary="Converte uma imagem 2D em um modelo 3D (.glb)",
)
async def convert(
    file: UploadFile = File(..., description="Arquivo de imagem (PNG, JPEG, etc)."),
    resolution: int = Query(
        128,
        ge=MIN_RESOLUTION,
        le=MAX_RESOLUTION,
        description="Numero de vertices ao longo do maior lado da malha.",
    ),
    depth_scale: float = Query(
        0.3,
        ge=0.0,
        le=2.0,
        description="Intensidade da extrusao 3D, relativa a largura do plano.",
    ),
    invert: bool = Query(False, description="Inverte a profundidade (areas claras ficam baixas)."),
    smooth: bool = Query(True, description="Suaviza o heightmap antes de gerar a malha."),
) -> Response:
    if file.content_type not in ACCEPTED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="O arquivo enviado precisa ser uma imagem JPEG ou PNG.")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Arquivo de imagem vazio.")

    try:
        image = Image.open(io.BytesIO(raw))
        image.load()
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Nao foi possivel ler a imagem enviada.") from exc

    options = MeshOptions(resolution=resolution, depth_scale=depth_scale, invert=invert, smooth=smooth)

    try:
        glb_bytes = image_to_glb(image, options)
    except Exception as exc:  # pragma: no cover - fallback defensivo
        raise HTTPException(status_code=500, detail=f"Falha ao gerar o modelo 3D: {exc}") from exc

    out_name = (file.filename or "model").rsplit(".", 1)[0] + ".glb"
    return Response(
        content=glb_bytes,
        media_type="model/gltf-binary",
        headers={"Content-Disposition": f'attachment; filename="{out_name}"'},
    )


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

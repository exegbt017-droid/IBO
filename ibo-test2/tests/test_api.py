import io
from urllib.parse import urlparse

import pygltflib
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def _sample_png_bytes(size=(32, 20)) -> bytes:
    image = Image.new("RGB", size)
    pixels = image.load()
    for x in range(size[0]):
        for y in range(size[1]):
            pixels[x, y] = (x * 8 % 256, y * 8 % 256, 128)
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_convert_returns_valid_glb():
    png_bytes = _sample_png_bytes()
    response = client.post(
        "/convert",
        files={"file": ("sample.png", png_bytes, "image/png")},
        params={"resolution": 32, "depth_scale": 0.4},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "model/gltf-binary"
    assert response.content[:4] == b"glTF"

    gltf_obj = pygltflib.GLTF2().load_from_bytes(response.content)
    assert len(gltf_obj.meshes) == 1
    assert len(gltf_obj.accessors) == 4
    assert len(gltf_obj.images) == 1

    positions_accessor = gltf_obj.accessors[0]
    assert positions_accessor.count == 32 * 20


def test_convert_exposes_model_and_viewer_urls():
    png_bytes = _sample_png_bytes()
    response = client.post(
        "/convert",
        files={"file": ("sample.png", png_bytes, "image/png")},
        params={"resolution": 16},
    )
    assert response.status_code == 200

    model_url = response.headers["x-model-url"]
    viewer_url = response.headers["x-gltf-viewer-url"]
    assert model_url.endswith(".glb")
    assert "/models/" in model_url
    assert viewer_url == f"https://gltf-viewer.donmccurdy.com/#model={model_url}"

    model_response = client.get(urlparse(model_url).path)
    assert model_response.status_code == 200
    assert model_response.content == response.content


def test_get_model_not_found():
    response = client.get("/models/does-not-exist.glb")
    assert response.status_code == 404


def test_convert_rejects_non_image():
    response = client.post(
        "/convert",
        files={"file": ("sample.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 400


def test_convert_rejects_bad_resolution():
    png_bytes = _sample_png_bytes()
    response = client.post(
        "/convert",
        files={"file": ("sample.png", png_bytes, "image/png")},
        params={"resolution": 4},
    )
    assert response.status_code == 422

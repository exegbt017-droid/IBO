"""Conversao de uma imagem 2D em uma malha 3D (glTF/GLB).

A profundidade de cada pixel e estimada a partir da sua luminancia
(heightmap): pixels mais claros ficam mais "altos" (ou mais baixos, se
`invert=True`). A imagem original e aplicada como textura sobre a malha
gerada, resultando em um relevo 3D texturizado exportado em GLB.
"""
from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
import pygltflib as gltf
from PIL import Image, ImageOps

MIN_RESOLUTION = 8
MAX_RESOLUTION = 512
MAX_TEXTURE_SIZE = 1024


@dataclass
class MeshOptions:
    resolution: int = 128
    depth_scale: float = 0.3
    invert: bool = False
    smooth: bool = True


def _pad4(data: bytes) -> bytes:
    padding = (-len(data)) % 4
    return data + b"\x00" * padding


def _grid_dimensions(width: int, height: int, resolution: int) -> tuple[int, int]:
    resolution = max(MIN_RESOLUTION, min(MAX_RESOLUTION, resolution))
    if width >= height:
        grid_w = resolution
        grid_h = max(2, round(resolution * height / width))
    else:
        grid_h = resolution
        grid_w = max(2, round(resolution * width / height))
    return grid_w, grid_h


def _build_geometry(depth: np.ndarray, plane_w: float, plane_h: float, depth_scale: float):
    grid_h, grid_w = depth.shape

    xs = (np.linspace(0.0, 1.0, grid_w) - 0.5) * plane_w
    ys = (0.5 - np.linspace(0.0, 1.0, grid_h)) * plane_h
    grid_x, grid_y = np.meshgrid(xs, ys)
    grid_z = depth * depth_scale

    positions = np.stack([grid_x, grid_y, grid_z], axis=-1).reshape(-1, 3).astype(np.float32)

    us = np.linspace(0.0, 1.0, grid_w)
    vs = np.linspace(0.0, 1.0, grid_h)
    grid_u, grid_v = np.meshgrid(us, vs)
    uvs = np.stack([grid_u, grid_v], axis=-1).reshape(-1, 2).astype(np.float32)

    i_idx, j_idx = np.meshgrid(np.arange(grid_h - 1), np.arange(grid_w - 1), indexing="ij")
    i_idx = i_idx.ravel()
    j_idx = j_idx.ravel()

    def vid(i, j):
        return i * grid_w + j

    v00 = vid(i_idx, j_idx)
    v01 = vid(i_idx, j_idx + 1)
    v10 = vid(i_idx + 1, j_idx)
    v11 = vid(i_idx + 1, j_idx + 1)

    tri1 = np.stack([v00, v10, v11], axis=1)
    tri2 = np.stack([v00, v11, v01], axis=1)
    indices = np.concatenate([tri1, tri2], axis=0).reshape(-1).astype(np.uint32)

    normals = _compute_vertex_normals(positions, indices)

    return positions, normals, uvs, indices


def _compute_vertex_normals(positions: np.ndarray, indices: np.ndarray) -> np.ndarray:
    faces = indices.reshape(-1, 3)
    p0 = positions[faces[:, 0]]
    p1 = positions[faces[:, 1]]
    p2 = positions[faces[:, 2]]
    face_normals = np.cross(p1 - p0, p2 - p0)

    normals = np.zeros_like(positions)
    for k in range(3):
        np.add.at(normals, faces[:, k], face_normals)

    lengths = np.linalg.norm(normals, axis=1)
    lengths[lengths == 0] = 1.0
    normals = (normals.T / lengths).T
    return normals.astype(np.float32)


def _texture_png_bytes(image: Image.Image) -> bytes:
    image = ImageOps.exif_transpose(image).convert("RGB")
    width, height = image.size
    max_dim = max(width, height)
    if max_dim > MAX_TEXTURE_SIZE:
        scale = MAX_TEXTURE_SIZE / max_dim
        image = image.resize((max(1, round(width * scale)), max(1, round(height * scale))), Image.LANCZOS)
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def image_to_glb(image: Image.Image, options: MeshOptions) -> bytes:
    """Converte uma imagem PIL em bytes de um arquivo .glb (GLTF binario)."""
    image = ImageOps.exif_transpose(image)
    width, height = image.size

    grid_w, grid_h = _grid_dimensions(width, height, options.resolution)

    gray = image.convert("L").resize((grid_w, grid_h), Image.LANCZOS)
    depth = np.asarray(gray, dtype=np.float32) / 255.0
    if options.invert:
        depth = 1.0 - depth

    if options.smooth:
        depth = _box_blur(depth)

    plane_w = 1.0
    plane_h = plane_w * (height / width)

    positions, normals, uvs, indices = _build_geometry(depth, plane_w, plane_h, options.depth_scale)
    texture_bytes = _texture_png_bytes(image)

    return _build_glb(positions, normals, uvs, indices, texture_bytes)


def _box_blur(depth: np.ndarray) -> np.ndarray:
    padded = np.pad(depth, 1, mode="edge")
    out = (
        padded[0:-2, 0:-2] + padded[0:-2, 1:-1] + padded[0:-2, 2:]
        + padded[1:-1, 0:-2] + padded[1:-1, 1:-1] + padded[1:-1, 2:]
        + padded[2:, 0:-2] + padded[2:, 1:-1] + padded[2:, 2:]
    ) / 9.0
    return out.astype(np.float32)


def _build_glb(
    positions: np.ndarray,
    normals: np.ndarray,
    uvs: np.ndarray,
    indices: np.ndarray,
    texture_png: bytes,
) -> bytes:
    pos_bytes = _pad4(positions.tobytes())
    norm_bytes = _pad4(normals.tobytes())
    uv_bytes = _pad4(uvs.tobytes())
    idx_bytes = _pad4(indices.tobytes())
    img_bytes = _pad4(texture_png)

    chunks = [
        ("pos", pos_bytes, len(positions.tobytes())),
        ("norm", norm_bytes, len(normals.tobytes())),
        ("uv", uv_bytes, len(uvs.tobytes())),
        ("idx", idx_bytes, len(indices.tobytes())),
        ("img", img_bytes, len(texture_png)),
    ]

    blob = b"".join(c[1] for c in chunks)
    offsets = {}
    offset = 0
    for name, padded, real_len in chunks:
        offsets[name] = (offset, real_len)
        offset += len(padded)

    g = gltf.GLTF2()
    g.buffers.append(gltf.Buffer(byteLength=len(blob)))

    def add_bufferview(name: str, target: int | None = None) -> int:
        byte_offset, byte_length = offsets[name]
        g.bufferViews.append(
            gltf.BufferView(buffer=0, byteOffset=byte_offset, byteLength=byte_length, target=target)
        )
        return len(g.bufferViews) - 1

    pos_bv = add_bufferview("pos", gltf.ARRAY_BUFFER)
    norm_bv = add_bufferview("norm", gltf.ARRAY_BUFFER)
    uv_bv = add_bufferview("uv", gltf.ARRAY_BUFFER)
    idx_bv = add_bufferview("idx", gltf.ELEMENT_ARRAY_BUFFER)
    img_bv = add_bufferview("img")

    g.accessors.append(
        gltf.Accessor(
            bufferView=pos_bv,
            componentType=gltf.FLOAT,
            count=len(positions),
            type="VEC3",
            max=positions.max(axis=0).tolist(),
            min=positions.min(axis=0).tolist(),
        )
    )
    g.accessors.append(
        gltf.Accessor(bufferView=norm_bv, componentType=gltf.FLOAT, count=len(normals), type="VEC3")
    )
    g.accessors.append(
        gltf.Accessor(bufferView=uv_bv, componentType=gltf.FLOAT, count=len(uvs), type="VEC2")
    )
    g.accessors.append(
        gltf.Accessor(
            bufferView=idx_bv,
            componentType=gltf.UNSIGNED_INT,
            count=len(indices),
            type="SCALAR",
        )
    )

    g.images.append(gltf.Image(bufferView=img_bv, mimeType="image/png"))
    g.samplers.append(gltf.Sampler(magFilter=gltf.LINEAR, minFilter=gltf.LINEAR))
    g.textures.append(gltf.Texture(source=0, sampler=0))
    g.materials.append(
        gltf.Material(
            pbrMetallicRoughness=gltf.PbrMetallicRoughness(
                baseColorTexture=gltf.TextureInfo(index=0),
                metallicFactor=0.0,
                roughnessFactor=1.0,
            ),
            doubleSided=True,
        )
    )

    primitive = gltf.Primitive(
        attributes=gltf.Attributes(POSITION=0, NORMAL=1, TEXCOORD_0=2),
        indices=3,
        material=0,
    )
    g.meshes.append(gltf.Mesh(primitives=[primitive]))
    g.nodes.append(gltf.Node(mesh=0))
    g.scenes.append(gltf.Scene(nodes=[0]))
    g.scene = 0

    g.set_binary_blob(blob)
    return b"".join(g.save_to_bytes())

#!/usr/bin/env python3
"""Converte o video de um posto em um panorama pronto para virar cenario.

Uso:
    python3 tools/video_para_panorama.py VIDEO --posto 02 [--nome "Sala 12"]

Gera em backend/app/static/assets/postos/posto_XX/:
    panorama.jpg    imagem do cenario (recortada, sem bordas pretas)
    panorama.json   metadados (abertura horizontal, usada para montar a cena)

O script tambem afere a qualidade do material e avisa quando o video nao
serve — melhor descobrir aqui do que no dia do evento.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "backend" / "app" / "static" / "assets" / "postos"

# Abertura horizontal tipica de camera de celular; usada para estimar o
# quanto o panorama cobre e, com isso, ate onde o participante pode girar.
FOV_CAMERA_GRAUS = 58.0
FOCAL_RELATIVA = 0.9  # focal ~= 0.9 * largura, aproximacao usual de celular


def ffmpeg() -> str:
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return "ffmpeg"


def extrair_quadros(video: Path, destino: Path, largura: int = 1920) -> list[Path]:
    destino.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [ffmpeg(), "-v", "error", "-i", str(video), "-vf", f"scale={largura}:-1",
         str(destino / "f%04d.png")],
        check=True,
    )
    return sorted(destino.glob("*.png"))


def nitidez(img: np.ndarray) -> float:
    return float(cv2.Laplacian(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var())


def giro_acumulado(imgs: list[np.ndarray]) -> float:
    """Quantos graus a camera varreu na horizontal, somando quadro a quadro."""
    if len(imgs) < 2:
        return 0.0
    largura = imgs[0].shape[1]
    focal = FOCAL_RELATIVA * largura
    sift = cv2.SIFT_create(2000)
    bf = cv2.BFMatcher()
    total = 0.0
    anterior = None
    for img in imgs:
        cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        atual = sift.detectAndCompute(cinza, None)
        if anterior is not None and anterior[1] is not None and atual[1] is not None:
            pares = bf.knnMatch(anterior[1], atual[1], k=2)
            bons = [a for a, b in pares if a.distance < 0.75 * b.distance]
            if len(bons) >= 15:
                p1 = np.float32([anterior[0][x.queryIdx].pt for x in bons])
                p2 = np.float32([atual[0][x.trainIdx].pt for x in bons])
                dx = float(np.median((p2 - p1)[:, 0]))
                total += abs(np.degrees(np.arctan2(dx, focal)))
        anterior = atual
    return total


def escolher_quadros(imgs: list[np.ndarray], por_bloco: int = 8) -> list[int]:
    """Pega o quadro mais nitido de cada bloco: descarta borrao sem perder cobertura."""
    notas = [nitidez(i) for i in imgs]
    escolhidos = []
    for inicio in range(0, len(imgs), por_bloco):
        bloco = range(inicio, min(inicio + por_bloco, len(imgs)))
        escolhidos.append(max(bloco, key=lambda i: notas[i]))
    return escolhidos


def recorte_util(img: np.ndarray, tolerancia: float = 0.02) -> np.ndarray:
    """Recorta as bordas pretas da costura preservando o conteudo.

    Um retangulo estritamente sem falhas costuma cair na faixa central e
    descartar o chao — justamente onde os animais ficam. Entao aceitamos uma
    fracao pequena de pixels invalidos e preenchemos o que sobrar.
    """
    cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    invalido = (cinza <= 8).astype(np.uint8)

    topo, base = 0, img.shape[0]
    esq, dir_ = 0, img.shape[1]

    # Vai aparando a borda mais esburacada ate sobrar pouca falha.
    while True:
        janela = invalido[topo:base, esq:dir_]
        if janela.size == 0 or janela.mean() <= tolerancia:
            break
        candidatos = {
            "topo": janela[0, :].mean(),
            "base": janela[-1, :].mean(),
            "esq": janela[:, 0].mean(),
            "dir": janela[:, -1].mean(),
        }
        pior = max(candidatos, key=candidatos.get)
        if pior == "topo":
            topo += 1
        elif pior == "base":
            base -= 1
        elif pior == "esq":
            esq += 1
        else:
            dir_ -= 1
        if base - topo < 50 or dir_ - esq < 50:
            break

    recorte = img[topo:base, esq:dir_].copy()

    # Preenche as falhas remanescentes usando a vizinhanca.
    cinza = cv2.cvtColor(recorte, cv2.COLOR_BGR2GRAY)
    buracos = (cinza <= 8).astype(np.uint8)
    if buracos.any():
        buracos = cv2.dilate(buracos, np.ones((3, 3), np.uint8), iterations=2)
        recorte = cv2.inpaint(recorte, buracos, 5, cv2.INPAINT_TELEA)

    return recorte


def realcar(img: np.ndarray, forca: float = 0.6) -> np.ndarray:
    """Devolve nitidez ao panorama (mascara de desfoque).

    Video de mao sempre carrega algum borrao de movimento, e a costura suaviza
    mais ainda ao fundir os quadros. Como o cenario ocupa quase toda a tela, o
    ganho aqui e o que mais se nota na experiencia.
    """
    borrado = cv2.GaussianBlur(img, (0, 0), sigmaX=2.4)
    realcado = cv2.addWeighted(img, 1 + forca, borrado, -forca, 0)

    # Um toque de contraste local, sem estourar as janelas ja saturadas.
    lab = cv2.cvtColor(realcado, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(8, 8)).apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", type=Path)
    ap.add_argument("--posto", required=True, help="ID do posto, ex: 02")
    ap.add_argument("--nome", default=None, help="Nome do ambiente (so para registro)")
    args = ap.parse_args()

    if not args.video.exists():
        print(f"ERRO: video nao encontrado: {args.video}", file=sys.stderr)
        return 1

    with tempfile.TemporaryDirectory() as tmp:
        print("Extraindo quadros...")
        arquivos = extrair_quadros(args.video, Path(tmp))
        imgs = [cv2.imread(str(f)) for f in arquivos]
        if len(imgs) < 6:
            print(f"ERRO: video curto demais ({len(imgs)} quadros).", file=sys.stderr)
            return 1
        print(f"  {len(imgs)} quadros a {imgs[0].shape[1]}x{imgs[0].shape[0]}")

        notas = [nitidez(i) for i in imgs]
        borrados = sum(1 for n in notas if n < np.median(notas) * 0.6)
        graus = giro_acumulado(imgs)
        print(f"  giro horizontal: ~{graus:.0f}°")
        print(f"  quadros borrados: {borrados}/{len(imgs)} ({100*borrados/len(imgs):.0f}%)")
        if borrados > len(imgs) * 0.5:
            print("  AVISO: muito borrao. Filme mais devagar ou com mais luz.")
        if graus < 25:
            print("  AVISO: giro pequeno. O cenario vai cobrir pouco do ambiente.")

        indices = escolher_quadros(imgs)
        print(f"Costurando {len(indices)} quadros...")
        costurador = cv2.Stitcher_create(cv2.Stitcher_PANORAMA)
        costurador.setPanoConfidenceThresh(0.3)
        status, pano = costurador.stitch([imgs[i] for i in indices])

        if status != cv2.Stitcher_OK:
            motivos = {
                cv2.Stitcher_ERR_NEED_MORE_IMGS: "quadros insuficientes ou sobreposicao baixa",
                cv2.Stitcher_ERR_HOMOGRAPHY_EST_FAIL: "nao foi possivel alinhar os quadros",
                cv2.Stitcher_ERR_CAMERA_PARAMS_ADJUST_FAIL: "falha ao ajustar a camera",
            }
            print(f"ERRO: costura falhou ({motivos.get(status, status)}).", file=sys.stderr)
            print("Dica: gire mais devagar, mantendo bastante sobreposicao.", file=sys.stderr)
            return 1

    pano = recorte_util(pano)
    pano = realcar(pano)
    altura, largura = pano.shape[:2]

    # O panorama cobre o que a camera varreu mais a propria abertura dela.
    fov_horizontal = min(360.0, graus + FOV_CAMERA_GRAUS)
    fov_vertical = fov_horizontal * altura / largura

    pasta = DESTINO / f"posto_{args.posto}"
    pasta.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(pasta / "panorama.jpg"), pano, [cv2.IMWRITE_JPEG_QUALITY, 88])

    meta = {
        "nome": args.nome or f"Posto {args.posto}",
        "origem": args.video.name,
        "largura": largura,
        "altura": altura,
        "fov_horizontal_graus": round(fov_horizontal, 1),
        "fov_vertical_graus": round(fov_vertical, 1),
    }
    (pasta / "panorama.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\nPronto: {pasta.relative_to(RAIZ)}/panorama.jpg  ({largura}x{altura})")
    print(f"Cobertura: {fov_horizontal:.0f}° na horizontal, {fov_vertical:.0f}° na vertical")
    print("\nNo JSON do posto, use:")
    print(json.dumps({
        "ambiente": {
            "tipo": "panorama",
            "url": f"/assets/postos/posto_{args.posto}/panorama.jpg",
            "fov_horizontal_graus": round(fov_horizontal, 1),
        }
    }, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

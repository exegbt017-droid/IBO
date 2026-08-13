# IBO - Conversor de imagens 2D para 3D

API HTTP em Python (FastAPI) que recebe uma imagem 2D e devolve um modelo
3D texturizado no formato **glTF binário (`.glb`)**.

## Como funciona

1. A imagem enviada é convertida em escala de cinza e usada como um
   *heightmap*: pixels mais claros geram relevo mais alto (ou mais baixo,
   se `invert=true`).
2. Uma malha (grade de triângulos) é gerada a partir desse heightmap,
   preservando a proporção da imagem original.
3. A imagem original é aplicada como textura sobre a malha.
4. O resultado é exportado como um único arquivo `.glb`, pronto para ser
   aberto em visualizadores 3D (Blender, three.js, Windows 3D Viewer, etc).

Todo o processamento é feito localmente (sem dependência de modelos de IA
externos), então funciona 100% offline.

## Instalação

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Executando o servidor

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Abra `http://localhost:8000/` para usar o **visualizador web**: escolha um
JPEG ou PNG, ajuste os parâmetros e veja o modelo 3D renderizado
diretamente no navegador (via three.js), com opção de baixar o `.glb`
gerado ou abri-lo com um clique no visualizador oficial
[gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/) — todo o
fluxo (enviar imagem → gerar modelo → visualizar) fica nessa única página,
sem precisar baixar e arrastar o arquivo manualmente.

A documentação interativa da API fica em `http://localhost:8000/docs`.

## Endpoints

### `GET /`

Visualizador web (upload de JPEG/PNG + preview 3D via three.js/glTF).

### `GET /health`

Verificação simples de que o serviço está no ar.

### `POST /convert`

Recebe uma imagem via `multipart/form-data` e retorna o arquivo `.glb`
gerado (binário, no corpo da resposta). Também inclui os headers:

- `X-Model-Url`: URL pública onde esse mesmo modelo pode ser buscado
  depois (`GET /models/{id}.glb`), com CORS liberado para
  `gltf-viewer.donmccurdy.com`.
- `X-Gltf-Viewer-Url`: link pronto no formato
  `https://gltf-viewer.donmccurdy.com/#model=<X-Model-Url>`, que abre o
  modelo já carregado no visualizador oficial.

**Parâmetros (query string):**

| Parâmetro     | Tipo    | Padrão | Descrição                                                              |
|---------------|---------|--------|--------------------------------------------------------------------------|
| `resolution`  | int     | `128`  | Número de vértices ao longo do maior lado da malha (8–512).             |
| `depth_scale` | float   | `0.3`  | Intensidade da extrusão 3D, relativa à largura do plano (0–2).          |
| `invert`      | bool    | `false`| Inverte a profundidade (áreas claras ficam baixas em vez de altas).     |
| `smooth`      | bool    | `true` | Aplica um leve desfoque no heightmap antes de gerar a malha.            |

**Exemplo:**

```bash
curl -X POST "http://localhost:8000/convert?resolution=256&depth_scale=0.4" \
  -F "file=@minha_imagem.jpg" \
  -o modelo.glb
```

Abra `modelo.glb` em qualquer visualizador glTF (ex: https://gltf-viewer.donmccurdy.com/),
ou use o link pronto retornado em `X-Gltf-Viewer-Url`.

### `GET /models/{id}.glb`

Serve, por até 30 minutos, um modelo previamente gerado por `/convert`.
Usado internamente pela página web e pelo link do gltf-viewer.donmccurdy.com
para buscar o arquivo sem precisar de upload manual. Responde `404` se o
`id` não existir ou já tiver expirado.

## Testes

```bash
pytest tests/ -v
```

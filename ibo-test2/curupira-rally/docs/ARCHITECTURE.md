# Curupira Rally — Arquitetura

> Referência técnica do projeto. A análise completa (riscos, comparação de
> tecnologias, justificativas) foi apresentada na conversa que originou este
> repositório; este documento resume as decisões para consulta rápida.

## Stack escolhida

| Camada | Escolha | Por quê |
|---|---|---|
| 3D / front-end | **Three.js** (vanilla JS + Vite) | Mobile-first, sem build pesado, compatível com WebXR futuramente, GLTFLoader nativo |
| Reconstrução de ambientes (pipeline offline, pré-evento) | **Fotogrametria** (ex. Polycam, Meshroom, RealityCapture) → exportar GLB | Gera mesh+textura direto em glTF; mais previsível que NeRF/Gaussian Splatting para navegação em mobile web hoje |
| Formato de modelo | **GLB** (glTF binário) | Único arquivo, leve, padrão, textura embutida |
| Backend | **FastAPI + SQLite** | Zero-ops, um arquivo `.db`, fácil de rodar em qualquer VPS barata |
| Persistência de progresso | **localStorage (principal) + SQLite (best-effort)** | Funciona offline no meio do mato; sincroniza quando há conexão |
| i18n | JSON em `frontend/src/i18n/locales/` | Nenhum texto hardcoded nos componentes |

## Fluxo de dados

```
QR Code (/posto/01)
   │
   ▼
router.js le o ID do posto na URL
   │
   ▼
api/client.js -> GET /api/postos/01  (FastAPI expande os animais do posto
   │                                   a partir de content/animals.json)
   ▼
main.js:
   - EnvironmentLoader carrega o ambiente (procedural ou .glb real)
   - CurupiraCharacter entra em cena
   - AnimalEntity instancia os 3 animais do posto
   - state.js guarda progresso; ui/App.js renderiza a UI reativa ao estado
   ▼
Participante investiga animais, responde ao desafio final
   ▼
POST /api/progress (best-effort, grava em SQLite)
```

## Por que "procedural" e não .glb no MVP

Ainda não existem vídeos reais dos postos. `EnvironmentLoader.js` e
`CurupiraCharacter.js` foram desenhados para que a **fonte dos dados** seja
irrelevante para quem os consome: `posto.ambiente.tipo` é `"procedural"`
(cena gerada em código, usado agora) ou `"glb"` (carregado via
`GLTFLoader`, usado quando o pipeline de fotogrametria de um posto estiver
pronto). Trocar um pelo outro é editar o JSON do posto, não o código.

## Como adicionar um novo posto

1. Gravar o vídeo do ambiente e processá-lo no pipeline de reconstrução
   (fora deste repositório) até obter um `.glb` otimizado.
2. Colocar o arquivo em `backend/app/static/assets/postos/posto_XX/environment.glb`.
3. Criar `backend/app/content/postos/posto_XX.json` (copiar a estrutura de
   `posto_01.json`), com `"ambiente": {"tipo": "glb", "url": "/assets/postos/posto_XX/environment.glb"}`.
4. Adicionar animais novos em `backend/app/content/animals.json`, se
   necessário (são compartilhados entre postos).
5. Gerar um QR Code apontando para `/posto/XX`.

Nenhum arquivo `.js` precisa mudar.

## Limitações conhecidas do MVP (propositais)

- Curupira e animais são geometria procedural (placeholder), não modelos
  `.glb` finais com esqueleto/animação — a API (`enter/talk/celebrate`)
  já está pronta para receber um modelo real sem mudar quem a usa.
- Apenas 1 posto, 1 pergunta final por posto, sem mapa/sequência de postos
  na interface (o `proximo_posto` já está no dado, só falta a tela).
- Chave de identificação simplificada (seção 10 do briefing) ainda não
  implementada — o campo `chave_identificacao` já existe no schema do
  animal para isso.
- QR Code é resolvido pela câmera nativa do celular (aponta para uma URL);
  não há leitor de QR embutido no app.

Essas limitações são as fronteiras deliberadas do MVP (seção 14 do
briefing) — a "segunda fase" (seção 15) e "terceira fase" (seção 16) do
projeto endereçam cada uma delas.

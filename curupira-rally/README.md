# Curupira Rally (MVP)

Experiência educativa gamificada de investigação da biodiversidade: rally
presencial com postos físicos identificados por QR Code, cada um levando a
um ambiente 3D onde o Curupira guia o participante em desafios de Biologia.

Veja a análise de arquitetura completa em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Este MVP cobre **1 posto completo**: ambiente 3D (procedural, enquanto não
há vídeo real do local), Curupira, 3 animais investigáveis, um desafio
final e pontuação — em português e espanhol, otimizado para celular.

## Rodando localmente

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8040
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173/posto/01` no celular (ou emule um viewport
mobile no navegador). O `vite.config.js` já faz proxy de `/api` e
`/assets` para `http://127.0.0.1:8040`.

## Testes

```bash
cd backend && source .venv/bin/activate && pytest tests/ -v
```

## Estrutura

```
backend/    FastAPI: conteudo dos postos/animais (JSON) + progresso (SQLite)
frontend/   Vite + Three.js: cena 3D, Curupira, animais, UI, i18n
docs/       Documentacao de arquitetura
```

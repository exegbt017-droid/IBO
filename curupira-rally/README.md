# Curupira Rally (MVP)

Experiência educativa gamificada de investigação da biodiversidade: rally
presencial com postos físicos identificados por QR Code, cada um levando a
um ambiente 3D onde o Curupira guia o participante em desafios de Biologia.

Veja a análise de arquitetura completa em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Este MVP cobre **1 posto completo**: ambiente 3D (procedural, enquanto não
há vídeo real do local), Curupira, 3 animais investigáveis, um desafio
final e pontuação — em português e espanhol, otimizado para celular.

## Como rodar

Só precisa de **Python 3.10+**. Não precisa de Node: a interface já vem
construída no repositório.

```bash
cd curupira-rally
./start.sh
```

Depois abra no navegador:

```
http://localhost:8040/posto/01
```

O script cria o ambiente virtual, instala as dependências e sobe o
servidor. Para usar outra porta: `./start.sh 9000`.

### Abrindo no celular

O `start.sh` imprime também um endereço com o IP da máquina, algo como
`http://192.168.0.15:8040/posto/01`. Com o celular na **mesma rede Wi-Fi**
do computador, abra esse endereço — é essa URL que vai no QR Code do posto
durante o evento.

### Windows (sem bash)

```powershell
cd curupira-rally\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8040
```

## Desenvolvendo a interface

A interface construída fica em `backend/app/static/web/`. Se você alterar
algo em `frontend/src/`, precisa reconstruir (aí sim requer Node):

```bash
./start.sh --build
```

Ou, para desenvolvimento com recarregamento automático, rode os dois
servidores separados:

```bash
# terminal 1
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8040
# terminal 2
cd frontend && npm install && npm run dev     # abre em http://localhost:5173
```

## Testes

```bash
cd backend && source .venv/bin/activate && pytest tests/ -v
```

## Estrutura

```
start.sh    Sobe o projeto inteiro com um comando
backend/    FastAPI: conteudo dos postos/animais (JSON), progresso (SQLite)
            e a interface ja construida (app/static/web/)
frontend/   Codigo-fonte da interface: Vite + Three.js, cena 3D, i18n
docs/       Documentacao de arquitetura
```

## Rotas

| Rota | O que faz |
|---|---|
| `GET /posto/{id}` | Abre a experiência do posto (é a URL do QR Code) |
| `GET /api/postos/{id}` | Conteúdo do posto em JSON (animais já expandidos) |
| `GET /api/animals` | Banco de espécies |
| `POST /api/progress` | Registra pontuação do participante |
| `GET /health` | Verificação de que o serviço está no ar |

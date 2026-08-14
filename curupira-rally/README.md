# Curupira Rally (MVP)

Experiência educativa gamificada de investigação da biodiversidade: rally
presencial com postos físicos identificados por QR Code, cada um levando a
um ambiente 3D onde o Curupira guia o participante em desafios de Biologia.

Veja a análise de arquitetura completa em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Este MVP cobre **1 posto completo**: o cenário é a sala real, montado a
partir de um vídeo gravado no local; o Curupira apresenta a missão, três
animais podem ser investigados e há um desafio final com pontuação — em
português e espanhol, otimizado para celular.

## Do vídeo ao cenário

O participante não caminha pelo ambiente: ele olha em volta, observa os
animais e responde. Por isso o cenário é uma **foto panorâmica do local
real**, projetada numa tela curva ao redor da cena, com o Curupira e os
animais em 3D à frente.

Basta **girar a câmera no local** — não é preciso reconstrução 3D:

```bash
pip install -r tools/requirements.txt        # só na primeira vez
python3 tools/video_para_panorama.py meu_video.mp4 --posto 01 --nome "Sala 12"
```

O script escolhe os quadros mais nítidos, costura o panorama, recorta as
bordas e mede a cobertura em graus. Ele também afere a qualidade do vídeo
e avisa quando o material não serve — melhor descobrir ali do que no dia
do evento. Ao final imprime o trecho de JSON pronto para colar no posto.

**Como gravar:** gire devagar (uns 15°/s), com boa luz, evitando apontar
direto para janelas. Um giro de 20 a 30 segundos cobre bem um ambiente.
A câmera deve girar **parada no lugar** — é isso que a costura espera.

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

## Modo offline (plano B para o evento)

Gera um arquivo `.html` por posto que roda **sozinho**: sem servidor, sem
internet, com a experiência inteira (cena 3D, Curupira, animais, desafios,
fontes) embutida no próprio arquivo.

```bash
cd frontend && npm run build:offline
# gera offline/posto-01.html
```

Basta abrir o arquivo no navegador — ou copiá-lo para o celular. Útil se a
conexão falhar no local do evento. Nesse modo a pontuação fica salva no
próprio aparelho, já que não há servidor para receber.

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
tools/      Pipeline de conteudo: video do local -> cenario panoramico
backend/    FastAPI: conteudo dos postos/animais (JSON), progresso (SQLite),
            cenarios (app/static/assets/) e a interface construida
frontend/   Codigo-fonte da interface: Vite + Three.js, cena 3D, i18n
offline/    Arquivos .html autossuficientes, um por posto (plano B)
docs/       Documentacao de arquitetura
```

## Tipos de ambiente

Definidos no JSON do posto, em `ambiente.tipo`:

| Tipo | Quando usar |
|---|---|
| `panorama` | Padrão. Foto do local real; basta girar a câmera no lugar. |
| `glb` | Malha 3D reconstruída por fotogrametria, se houver vídeo adequado (o participante precisaria caminhar filmando). |
| `procedural` | Cena gerada em código, para quando não há material do local. |

## Rotas

| Rota | O que faz |
|---|---|
| `GET /posto/{id}` | Abre a experiência do posto (é a URL do QR Code) |
| `GET /api/postos/{id}` | Conteúdo do posto em JSON (animais já expandidos) |
| `GET /api/animals` | Banco de espécies |
| `POST /api/progress` | Registra pontuação do participante |
| `GET /health` | Verificação de que o serviço está no ar |

#!/usr/bin/env bash
# Curupira Rally - sobe o projeto inteiro com um comando.
#
#   ./start.sh            # porta 8040
#   ./start.sh 9000       # porta customizada
#
# Nao precisa de Node: a interface ja vem construida no repositorio.
# Se Node estiver instalado E a interface tiver sido alterada, use
# ./start.sh --build para reconstruir antes de subir.

set -euo pipefail

cd "$(dirname "$0")"

PORT=8040
BUILD=0
for arg in "$@"; do
  case "$arg" in
    --build) BUILD=1 ;;
    [0-9]*)  PORT="$arg" ;;
  esac
done

PYTHON="${PYTHON:-python3}"
if ! command -v "$PYTHON" >/dev/null 2>&1; then
  echo "ERRO: python3 nao encontrado. Instale o Python 3.10+ e tente de novo." >&2
  exit 1
fi

if [ "$BUILD" = "1" ]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "ERRO: --build precisa do Node/npm instalado." >&2
    exit 1
  fi
  echo "==> Construindo a interface..."
  (cd frontend && npm install --silent && npm run build)
fi

cd backend

if [ ! -d .venv ]; then
  echo "==> Criando ambiente virtual..."
  "$PYTHON" -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

echo "==> Instalando dependencias..."
pip install -q --disable-pip-version-check -r requirements.txt

if [ ! -f app/static/web/index.html ]; then
  echo "AVISO: interface nao encontrada em backend/app/static/web/." >&2
  echo "       Rode ./start.sh --build (requer Node) para construi-la." >&2
fi

echo
echo "======================================================"
echo "  Curupira Rally rodando"
echo
echo "  Neste computador:  http://localhost:${PORT}/posto/01"
for ip in $(hostname -I 2>/dev/null || true); do
  echo "  No celular:        http://${ip}:${PORT}/posto/01"
done
echo
echo "  (Ctrl+C para parar)"
echo "======================================================"
echo

exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"

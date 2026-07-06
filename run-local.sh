#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Backend
cd "$ROOT/backend"
if [ ! -d venv ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt

set -a
source .env
set +a

# Dev: Vite on 5173 proxies /api → backend on 5001
unset MANAGEX_FRONTEND_DIST

echo "Backend:  http://localhost:5001"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop both."

python app.py &
BACKEND_PID=$!
trap 'kill $BACKEND_PID 2>/dev/null' EXIT

cd "$ROOT/frontend"
npm install --silent
npm run dev

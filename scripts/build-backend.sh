#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"

cd "$BACKEND"

if [[ ! -d venv ]]; then
  python3 -m venv venv
fi

# shellcheck disable=SC1091
source venv/bin/activate

PIP_USER=0 python3 -m pip install -q -r requirements.txt pyinstaller

pyinstaller managex.spec --noconfirm --clean

echo "Backend binary: $BACKEND/dist/managex-server"

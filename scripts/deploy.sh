#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="root@187.127.173.79"
PASS="${MANAGEX_DEPLOY_PASS:?Set MANAGEX_DEPLOY_PASS before running deploy.sh}"
REMOTE_DIR="/opt/managex"
STAGING="/tmp/managex-deploy-$$"

echo "==> Building frontend..."
cd "$ROOT/frontend"
npm run build --silent

echo "==> Packaging release..."
rm -rf "$STAGING"
mkdir -p "$STAGING/backend" "$STAGING/frontend"
rsync -a \
  --exclude 'venv' --exclude '__pycache__' --exclude '*.db' --exclude 'build' --exclude 'dist/managex-server' \
  "$ROOT/backend/" "$STAGING/backend/"
rsync -a "$ROOT/frontend/dist/" "$STAGING/frontend/dist/"
mkdir -p "$STAGING/backend/data"
rsync -a "$ROOT/backend/uploads/profile_photos/" "$STAGING/backend/uploads/profile_photos/" 2>/dev/null || true
cp "$ROOT/deploy/managex.env" "$STAGING/backend/.env"
cp "$ROOT/deploy/managex-backend.service" "$STAGING/"
cp "$ROOT/deploy/nginx-managex.conf" "$STAGING/"

tar -czf /tmp/managex-deploy.tar.gz -C "$STAGING" .
rm -rf "$STAGING"

echo "==> Uploading to server..."
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$REMOTE" "mkdir -p $REMOTE_DIR && rm -rf $REMOTE_DIR/staging"
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no /tmp/managex-deploy.tar.gz "$REMOTE:/tmp/managex-deploy.tar.gz"

echo "==> Installing on server..."
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$REMOTE" bash -s << 'REMOTE_SCRIPT'
set -euo pipefail
REMOTE_DIR="/opt/managex"
mkdir -p "$REMOTE_DIR"
if [ -f "$REMOTE_DIR/backend/firebase-service-account.json" ]; then
  cp "$REMOTE_DIR/backend/firebase-service-account.json" /tmp/managex-firebase-sa-backup.json
fi
tar -xzf /tmp/managex-deploy.tar.gz -C "$REMOTE_DIR"
rm -f /tmp/managex-deploy.tar.gz

if [ -f /tmp/managex-firebase-sa-backup.json ]; then
  cp /tmp/managex-firebase-sa-backup.json "$REMOTE_DIR/backend/firebase-service-account.json"
  chmod 600 "$REMOTE_DIR/backend/firebase-service-account.json"
  rm -f /tmp/managex-firebase-sa-backup.json
fi

cd "$REMOTE_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

mkdir -p data/uploads/profile_photos
if [ -d uploads/profile_photos ] && [ "$(ls -A uploads/profile_photos 2>/dev/null)" ]; then
  cp -n uploads/profile_photos/* data/uploads/profile_photos/ 2>/dev/null || true
fi

source venv/bin/activate
python -c "from app import create_app, seed_database; app=create_app(); app.app_context().push(); seed_database()"

# systemd
cp "$REMOTE_DIR/managex-backend.service" /etc/systemd/system/managex-backend.service
systemctl daemon-reload
systemctl enable managex-backend
systemctl restart managex-backend
sleep 2
systemctl is-active managex-backend

# SSL cert if missing
if [ ! -d /etc/letsencrypt/live/managex.neighshopglobal.com ]; then
  certbot certonly --nginx \
    -d managex.neighshopglobal.com \
    -d backend.managex.neighshopglobal.com \
    --non-interactive --agree-tos -m aakarshanmishra27@gmail.com || \
  certbot certonly --webroot -w /var/www/certbot \
    -d managex.neighshopglobal.com \
    -d backend.managex.neighshopglobal.com \
    --non-interactive --agree-tos -m aakarshanmishra27@gmail.com
fi

cp "$REMOTE_DIR/nginx-managex.conf" /etc/nginx/conf.d/managex.conf
nginx -t
systemctl reload nginx

echo "==> Health check..."
curl -sf http://127.0.0.1:5033/api/health
echo ""
curl -sf -o /dev/null -w "frontend HTTPS: %{http_code}\n" https://managex.neighshopglobal.com/ || true
curl -sf https://backend.managex.neighshopglobal.com/api/health || true
echo ""
echo "Deploy complete."
REMOTE_SCRIPT

rm -f /tmp/managex-deploy.tar.gz
echo "Done. https://managex.neighshopglobal.com"

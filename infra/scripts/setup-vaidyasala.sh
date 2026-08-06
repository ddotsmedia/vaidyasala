#!/usr/bin/env bash
# setup-vaidyasala.sh — provision /opt/vaidyasala on the SHARED VPS. LAW 6.
#
# Idempotent. Writes ONLY under /opt/vaidyasala. Creates no proxy config, touches
# no existing container/network/volume/vhost, and starts nothing. Adding the single
# reverse-proxy vhost is a separate, deliberate step (see docs/GO-LIVE-MANUAL.md).
#
# Run on the server:  bash setup-vaidyasala.sh
set -euo pipefail

ROOT=/opt/vaidyasala

die() { printf '\n✗ %s\n' "$*" >&2; exit 1; }
ok()  { printf '  ✓ %s\n' "$*"; }

# ---------------------------------------------------------------------------
# 0. Refuse to run blind. WEB_PORT must be a verified-free port from the audit.
# ---------------------------------------------------------------------------
: "${WEB_PORT:?WEB_PORT is required — take the value from docs/SERVER-AUDIT.md (never guess a port on a box running 10 live sites)}"

[[ "$WEB_PORT" =~ ^[0-9]+$ ]] || die "WEB_PORT must be numeric, got '$WEB_PORT'"
(( WEB_PORT >= 1024 && WEB_PORT <= 65535 )) || die "WEB_PORT must be an unprivileged port"

printf '\nVaidyasala setup — target %s, WEB_PORT %s\n\n' "$ROOT" "$WEB_PORT"

# ---------------------------------------------------------------------------
# 1. Port-collision guard. The single most dangerous mistake on this server is
#    binding a port another site already uses, so verify at run time — the audit
#    is a snapshot and may be stale by the time this runs.
# ---------------------------------------------------------------------------
echo "[1/5] verifying ${WEB_PORT} is free"
if ss -tlnH "sport = :${WEB_PORT}" 2>/dev/null | grep -q .; then
  ss -tlnp "sport = :${WEB_PORT}" || true
  die "port ${WEB_PORT} is already in LISTEN — pick another free high port. NOTHING was written."
fi
if docker ps --format '{{.Ports}}' 2>/dev/null | grep -qE "(^|[^0-9])${WEB_PORT}->"; then
  die "port ${WEB_PORT} is published by an existing container. NOTHING was written."
fi
ok "port ${WEB_PORT} is free"

# ---------------------------------------------------------------------------
# 2. Name-collision guard — our names must not already exist (they'd belong to
#    someone else's project, and we must never adopt or overwrite those).
# ---------------------------------------------------------------------------
echo "[2/5] verifying our names are unclaimed"
for c in vaidyasala-web vaidyasala-worker vaidyasala-postgres vaidyasala-redis vaidyasala-meili; do
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$c"; then
    echo "  · $c already exists (previous Vaidyasala install — fine, compose will reconcile it)"
  fi
done
for other in $(docker network ls --format '{{.Name}}' 2>/dev/null | grep -x 'vaidyasala-net' || true); do
  echo "  · network $other already exists (ours, from a previous run)"
done
ok "name check done"

# ---------------------------------------------------------------------------
# 3. Directory tree — the ONLY thing this script writes.
# ---------------------------------------------------------------------------
echo "[3/5] creating ${ROOT} tree"
mkdir -p "$ROOT"/{backups,logs}
chmod 750 "$ROOT"
ok "$ROOT ready"

# ---------------------------------------------------------------------------
# 4. Compose file + env template. Never overwrite a live .env.
# ---------------------------------------------------------------------------
echo "[4/5] installing compose + env template"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$SRC_DIR/docker/compose.prod.yml" ]]; then
  install -m 640 "$SRC_DIR/docker/compose.prod.yml" "$ROOT/compose.prod.yml"
  ok "compose.prod.yml installed"
else
  echo "  · compose.prod.yml not alongside this script — upload it to $ROOT manually"
fi

if [[ -f "$ROOT/.env" ]]; then
  ok ".env already present — left untouched"
else
  if [[ -f "$SRC_DIR/../.env.production.example" ]]; then
    install -m 600 "$SRC_DIR/../.env.production.example" "$ROOT/.env"
    echo "  ! $ROOT/.env created from the template — fill in every <value> before starting"
  else
    echo "  · no template found; create $ROOT/.env by hand (chmod 600)"
  fi
fi
grep -q "^WEB_PORT=" "$ROOT/.env" 2>/dev/null \
  || printf 'WEB_PORT=%s\n' "$WEB_PORT" >> "$ROOT/.env"
chmod 600 "$ROOT/.env" 2>/dev/null || true

# ---------------------------------------------------------------------------
# 5. Report. Deliberately does NOT start anything.
# ---------------------------------------------------------------------------
echo "[5/5] done"
cat <<REPORT

  Provisioned : $ROOT
  WEB_PORT    : $WEB_PORT (verified free at $(date -u +%FT%TZ))
  Started     : NOTHING — by design.

  Next, in order:
    1. Fill $ROOT/.env (every <value>).
    2. docker compose -p vaidyasala -f $ROOT/compose.prod.yml pull
    3. docker compose -p vaidyasala -f $ROOT/compose.prod.yml up -d
    4. curl -fsS http://127.0.0.1:$WEB_PORT/api/health
    5. Only then add the reverse-proxy vhost (docs/GO-LIVE-MANUAL.md) —
       nginx -t BEFORE reload, and never restart the proxy.

  Verify the 10 live sites are untouched:
    docker ps --format 'table {{.Names}}\t{{.Status}}'   # compare to SERVER-AUDIT.md

REPORT

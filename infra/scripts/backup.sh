#!/usr/bin/env bash
# Vaidyasala DB backup (§10). pg_dump → gzip → (optional) gpg-encrypt → local
# /opt/vaidyasala/backups + (optional) Cloudflare R2. WAL archiving runs
# continuously in prod; this is the nightly full snapshot.
#
#   BACKUP_DIR, PG_CONTAINER, PGUSER, PGDATABASE, GPG_RECIPIENT (optional),
#   R2_* (optional) are read from the environment. Sensible dev defaults below.
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-vaidyasala-dev-postgres}"
PGUSER="${PGUSER:-vaidyasala}"
PGDATABASE="${PGDATABASE:-vaidyasala}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

BASENAME="vaidyasala-${STAMP}.sql.gz"
OUT="${BACKUP_DIR}/${BASENAME}"

echo "[backup] pg_dump ${PGDATABASE} (container ${PG_CONTAINER}) → ${OUT}"
# Custom-format is more flexible, but plain SQL gz keeps restore.sh dependency-free.
docker exec "$PG_CONTAINER" pg_dump -U "$PGUSER" --no-owner --clean --if-exists "$PGDATABASE" \
  | gzip -9 > "$OUT"

# Optional at-rest encryption (never store the key in the repo).
if [ -n "${GPG_RECIPIENT:-}" ]; then
  echo "[backup] encrypting for ${GPG_RECIPIENT}"
  gpg --yes --encrypt --recipient "$GPG_RECIPIENT" "$OUT"
  rm -f "$OUT"
  OUT="${OUT}.gpg"
fi

SIZE="$(wc -c < "$OUT")"
echo "[backup] wrote ${OUT} (${SIZE} bytes)"

# Optional upload to R2 (S3-compatible). Only backups/ ever — never other dirs (LAW 6).
if [ -n "${R2_ENDPOINT:-}" ] && [ -n "${R2_BUCKET_BACKUP:-}" ] && command -v aws >/dev/null 2>&1; then
  echo "[backup] uploading to R2 s3://${R2_BUCKET_BACKUP}/$(basename "$OUT")"
  AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID:-}" AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY:-}" \
    aws s3 cp "$OUT" "s3://${R2_BUCKET_BACKUP}/$(basename "$OUT")" \
    --endpoint-url "$R2_ENDPOINT" --only-show-errors
else
  echo "[backup] R2 not configured — kept local only (BLOCKED: set R2_* to enable)"
fi

# Retention: keep the last 30 local snapshots.
ls -1t "${BACKUP_DIR}"/vaidyasala-*.sql.gz* 2>/dev/null | tail -n +31 | xargs -r rm -f
echo "[backup] done"

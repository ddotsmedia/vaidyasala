#!/usr/bin/env bash
# Vaidyasala restore + monthly restore drill (§10) — "a backup that's never been
# restored is a hope, not a backup." Restores a backup into a SCRATCH database,
# verifies key table row counts, and (unless --keep) drops it. Non-destructive to
# the live DB by default.
#
#   restore.sh <backup.sql.gz[.gpg]> [--into <dbname>] [--keep]
#
# Env: PG_CONTAINER, PGUSER, VERIFY_DB. GPG is used automatically for .gpg files.
set -euo pipefail

BACKUP="${1:-}"
if [ -z "$BACKUP" ] || [ ! -f "$BACKUP" ]; then
  echo "usage: restore.sh <backup.sql.gz[.gpg]> [--into <dbname>] [--keep]" >&2
  exit 1
fi
shift

PG_CONTAINER="${PG_CONTAINER:-vaidyasala-dev-postgres}"
PGUSER="${PGUSER:-vaidyasala}"
TARGET_DB="${VERIFY_DB:-vaidyasala_restore_verify}"
KEEP=0
while [ $# -gt 0 ]; do
  case "$1" in
    --into) TARGET_DB="$2"; shift 2 ;;
    --keep) KEEP=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

echo "[restore] target scratch db: ${TARGET_DB}"
docker exec "$PG_CONTAINER" psql -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"${TARGET_DB}\";" \
  -c "CREATE DATABASE \"${TARGET_DB}\";" >/dev/null
# pgvector extension must exist before the dump recreates vector columns.
docker exec "$PG_CONTAINER" psql -U "$PGUSER" -d "${TARGET_DB}" -v ON_ERROR_STOP=1 \
  -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null

echo "[restore] streaming ${BACKUP} → ${TARGET_DB}"
DECOMPRESS="cat"
case "$BACKUP" in
  *.gpg) DECOMPRESS="gpg --quiet --decrypt" ;;
esac
$DECOMPRESS "$BACKUP" | gunzip -c | docker exec -i "$PG_CONTAINER" psql -U "$PGUSER" -d "${TARGET_DB}" -q >/dev/null

echo "[restore] verifying row counts:"
docker exec "$PG_CONTAINER" psql -U "$PGUSER" -d "${TARGET_DB}" -tA -F' ' \
  -c "SELECT 'Video', count(*) FROM \"Video\"
      UNION ALL SELECT 'Topic', count(*) FROM \"Topic\"
      UNION ALL SELECT 'TranscriptSegmentVector', count(*) FROM \"TranscriptSegmentVector\";" \
  | sed 's/^/  /'

VIDEOS="$(docker exec "$PG_CONTAINER" psql -U "$PGUSER" -d "${TARGET_DB}" -tAc "SELECT count(*) FROM \"Video\";")"
if [ "${VIDEOS:-0}" -lt 1 ]; then
  echo "[restore] FAILED: restored DB has no videos" >&2
  exit 1
fi

if [ "$KEEP" -eq 0 ]; then
  docker exec "$PG_CONTAINER" psql -U "$PGUSER" -d postgres -c "DROP DATABASE \"${TARGET_DB}\";" >/dev/null
  echo "[restore] drill OK — scratch db dropped"
else
  echo "[restore] restored into ${TARGET_DB} (kept)"
fi

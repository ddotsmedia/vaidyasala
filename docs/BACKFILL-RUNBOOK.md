# BACKFILL RUNBOOK — deploy `ef2d48d` and import the catalogue

Run from the VPS. Every command here is scoped to the `vaidyasala` compose
project; nothing touches the other 17 projects.

## 0. Prerequisites (the deploy fails without these)

```bash
cd "$DEPLOY_DIR"          # confirm which of /opt/vaidyasala or /opt/vaidhyasala exists

grep -E '^(WEB_PORT|ADMIN_API_TOKEN|YOUTUBE_API_KEY|YOUTUBE_CHANNEL_ID)=' .env
```

All four must be present:

| Var | Value | Without it |
|---|---|---|
| `WEB_PORT` | `8888` | compose **aborts** — `${WEB_PORT:?}` is deliberate |
| `ADMIN_API_TOKEN` | any long random string | token auth silently off; every curl 401s |
| `YOUTUBE_API_KEY` | rotated key | backfill job refuses to start |
| `YOUTUBE_CHANNEL_ID` | `UCADw8vrx5oszMLul5PHzCqA` | same |

Also check disk — the box was at 91%:

```bash
df -h /          # reclaim with: docker image prune    (NEVER `docker system prune`)
```

## 1. Deploy

```bash
cd "$DEPLOY_DIR"
git pull origin main
git log --oneline -1        # expect ef2d48d or later

docker compose -p vaidyasala -f infra/docker/compose.prod.yml pull web worker
docker compose -p vaidyasala -f infra/docker/compose.prod.yml up -d web worker
```

**Do not run `docker compose down`.** `up -d` recreates only what changed;
`down` takes the site fully offline for the whole rebuild.

**If you build images locally instead of pulling**, tag them as the compose file
expects, or compose will pull from GHCR and silently ignore your build:

```bash
docker build -f infra/docker/Dockerfile.web \
  -t ghcr.io/ddotsmedia/vaidyasala/web:latest .
```

`-t vaidhyasala-web:latest` does **not** match `compose.prod.yml` and will be
ignored.

## 2. Verify the endpoint

```bash
# No/!bad token → 401
curl -s -o /dev/null -w '%{http_code}\n' \
  -H 'authorization: Bearer wrong' \
  http://127.0.0.1:8888/api/admin/backfill

# Real token → 200 + queue JSON. THIS is the check that matters.
curl -s -H "authorization: Bearer $ADMIN_API_TOKEN" \
  http://127.0.0.1:8888/api/admin/backfill
```

401 alone only proves the route exists. With `ADMIN_API_TOKEN` unset a bad token
also 401s (it falls through to session auth), so **only the 200 proves token
auth is wired**. A 404 means the image did not rebuild.

## 3. Dry run (writes nothing)

```bash
curl -s -X POST http://127.0.0.1:8888/api/admin/backfill \
  -H "authorization: Bearer $ADMIN_API_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"mode":"import","limit":10,"dryRun":true,"delayMs":1000}'
```

Response is **202** with `{"jobId":"…","limit":10,"dryRun":true,…}` — not
`{"message":"Backfill job queued"}`.

```bash
docker logs -f vaidyasala-worker 2>&1 | grep -i backfill
```

Expect `10 uploads found` then `dry run — 10 videos would be imported`. There is
no "Batch 1/10" line; progress reads `N/M · created=… updated=… failed=…`.

## 4. Real import of 10

```bash
# count before
docker exec vaidyasala-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT status, COUNT(*) FROM "Video" GROUP BY status;'

curl -s -X POST http://127.0.0.1:8888/api/admin/backfill \
  -H "authorization: Bearer $ADMIN_API_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"mode":"import","limit":10,"dryRun":false,"delayMs":1000}'
```

`psql -U postgres -d vaidyasala` will **not** work — the DB runs in a container
with credentials from `.env`, and the table is `"Video"` (quoted, capitalised).

## 5. ⚠️ Publish — the step that makes them visible

**Imported videos are `INGESTING`, which is deliberately NOT visible.** The site
will still say "No videos yet" after step 4. That is correct behaviour, not a
bug — review them at `/admin/videos` first, then:

```bash
curl -s -X POST http://127.0.0.1:8888/api/admin/backfill \
  -H "authorization: Bearer $ADMIN_API_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"mode":"publish"}'
```

Only `INGESTING` is promoted — `HIDDEN` (an editor's decision) and `PROCESSING`
are left alone, and nothing is ever demoted.

Then force the ISR pages to regenerate, or the home page serves its cached
"empty" copy for up to 30 minutes:

```bash
curl -s -X POST http://127.0.0.1:8888/api/internal/revalidate \
  -H "authorization: Bearer $ADMIN_API_TOKEN"
```

## 6. Full catalogue

```bash
curl -s -X POST http://127.0.0.1:8888/api/admin/backfill \
  -H "authorization: Bearer $ADMIN_API_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"mode":"import","delayMs":500}'          # omit limit = whole channel
```

~22 YouTube quota units and a few minutes — the delay is between batches of 50,
not per video. Then publish and revalidate as in step 5.

### Do not delete the test videos first

The import is idempotent: re-running refreshes rows in place and keeps slug and
status. The 10 test videos are simply the first 10 of the 503. A cleanup step
adds a destructive operation for no benefit, and

```sql
DELETE FROM "Video" ORDER BY "createdAt" DESC LIMIT 10
```

deletes the 10 newest rows — which after a successful import are not necessarily
the test set.

## 7. Confirm the neighbours are untouched

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep -v '^vaidyasala-'
```

Compare against `docs/SERVER-AUDIT.md`. Nothing outside `vaidyasala-*` should
have changed.

---

## Appendix — setting `ADMIN_API_TOKEN` safely

Generate and append in **one remote shell**, so the substitution cannot happen
on the local side:

```bash
ssh root@194.164.151.202 'cd "$DEPLOY_DIR" && \
  grep -q "^ADMIN_API_TOKEN=." .env || printf "ADMIN_API_TOKEN=%s\n" "$(openssl rand -hex 32)" >> .env'
```

`grep -q "^ADMIN_API_TOKEN=."` — the trailing `.` requires at least one
character, so a previously-written empty `ADMIN_API_TOKEN=` is treated as absent
and replaced rather than kept.

Then restart web so it picks the value up (env is read at process start):

```bash
docker compose -p vaidyasala -f infra/docker/compose.prod.yml up -d web
```

### Watch the quoting

```bash
# WRONG — $( ) may expand LOCALLY, writing an empty value
ssh root@HOST "echo \"ADMIN_API_TOKEN=$(openssl rand -hex 16)\" >> .env"

# WRONG — quotes terminate early; the parens are parsed by the LOCAL shell
ssh root@HOST 'cd /opt/x && grep -E '^(WEB_PORT|ADMIN_API_TOKEN)=' .env'

# RIGHT — single-quote the whole remote command, escape nothing inside
ssh root@HOST 'cd /opt/x && grep -E "^(WEB_PORT|ADMIN_API_TOKEN)=" .env'
```

### Duplicate keys in `.env`

Docker Compose `env_file` takes the **last** occurrence — it does not error and
does not warn. So a stale key above a good one is harmless, and a stale key
*below* a good one silently wins. Find and fix with:

```bash
grep -n "^YOUTUBE_API_KEY=" .env     # keep the last, delete the rest
```

# GO-LIVE MANUAL — vaidhyasala.com

Everything Phase 7 cannot automate from here, as copy-paste steps. Nothing in this
file has been executed. The server was never contacted (see `SERVER-AUDIT.md`).

**Order matters. Do not skip step 0.**

---

## 0. PREREQUISITE — run the 7-PRE audit (blocking)

`docs/SERVER-AUDIT.md` is **NO-GO**: the read-only audit never ran, because ssh to
`194.164.151.202` is blocked from the agent environment. Until it runs you do not
know the existing proxy, the free ports, or the RAM headroom — and on a box with 10
live sites, guessing any of those can take someone else's site down.

Run the read-only block in `SERVER-AUDIT.md`, paste the output in, fill the table,
and write GO or NO-GO. Then continue here.

---

## 1. GitHub — secrets and the deploy switch

Repo → Settings → Secrets and variables → Actions.

| Kind | Name | Value |
|---|---|---|
| Secret | `VPS_HOST` | `194.164.151.202` |
| Secret | `VPS_USER` | `root` |
| Secret | `VPS_SSH_KEY` | contents of the private key that authenticates to the VPS |
| Variable | `ENABLE_DEPLOY` | `true` — **only after steps 2–4 pass** |

Prove the images build *before* wiring the deploy:

> Actions → Deploy → Run workflow → `build_only: true`

That pushes `web` and `worker` to GHCR without touching the server. The Dockerfiles
have never been built (no working Docker daemon locally) — expect to fix something
here on the first run.

---

## 2. Server — provision (writes only under `/opt/vaidyasala`)

```bash
scp -r infra root@194.164.151.202:/tmp/vaidyasala-infra
scp .env.production.example root@194.164.151.202:/tmp/vaidyasala-infra/.env.production.example
ssh root@194.164.151.202
  WEB_PORT=<the verified-free port from SERVER-AUDIT.md> \
    bash /tmp/vaidyasala-infra/scripts/setup-vaidyasala.sh
```

The script re-verifies the port is free and aborts having written nothing if it is
not. It starts no containers.

Then fill `/opt/vaidyasala/.env` (every `<value>`; `chmod 600`) and bring the stack
up:

```bash
cd /opt/vaidyasala
docker compose -p vaidyasala -f compose.prod.yml pull
docker compose -p vaidyasala -f compose.prod.yml up -d
docker compose -p vaidyasala -f compose.prod.yml run --rm --no-deps worker \
  node node_modules/prisma/build/index.js migrate deploy --schema packages/db/prisma/schema
curl -fsS http://127.0.0.1:${WEB_PORT}/api/health
```

**Immediately verify the other sites are untouched** — compare against the
`docker ps` snapshot in `SERVER-AUDIT.md`:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
ss -tlnp   # exactly ONE new listener vs the audit: 127.0.0.1:<WEB_PORT>
```

If anything outside `vaidyasala-*` differs, stop and investigate before going further.

---

## 3. Reverse proxy — ONE new vhost (LAW 6)

Pick the recipe matching `EXISTING_PROXY` from the audit. In all cases: never edit an
existing vhost, never restart the proxy, always test config before reloading.

### nginx (host-level)

```bash
cat > /etc/nginx/sites-available/vaidhyasala.com <<'EOF'
server {
  listen 80;
  listen [::]:80;
  server_name vaidhyasala.com www.vaidhyasala.com;

  # Only this host header is served — no default_server, no catch-all.
  location / {
    proxy_pass http://127.0.0.1:__WEB_PORT__;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        "upgrade";
    proxy_read_timeout 60s;
  }

  # §10 security headers. CSP is nonce-based and set by the app; do not duplicate it.
  add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
  add_header X-Content-Type-Options    "nosniff" always;
  add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
  add_header X-Frame-Options           "SAMEORIGIN" always;
  add_header Cross-Origin-Opener-Policy "same-origin" always;
}
EOF
sed -i "s/__WEB_PORT__/${WEB_PORT}/" /etc/nginx/sites-available/vaidhyasala.com
ln -s /etc/nginx/sites-available/vaidhyasala.com /etc/nginx/sites-enabled/vaidhyasala.com

nginx -t          # MUST pass before the next line
systemctl reload nginx   # reload, never restart
```

TLS: if the other sites use certbot, `certbot --nginx -d vaidhyasala.com -d www.vaidhyasala.com`.
If Cloudflare terminates TLS (proxied), an origin certificate is enough — match
whatever the audit found the existing sites doing.

### Traefik

Add labels to **our** `web` service only, in `compose.prod.yml`, then `up -d web`:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.vaidyasala.rule=Host(`vaidhyasala.com`)"
  - "traefik.http.routers.vaidyasala.entrypoints=websecure"
  - "traefik.http.routers.vaidyasala.tls.certresolver=<resolver from the audit>"
  - "traefik.http.services.vaidyasala.loadbalancer.server.port=3000"
```

This also requires attaching `web` to Traefik's existing network (external, in the
audit) — add it as a second network; never rename or recreate theirs.

### Nginx Proxy Manager

UI → Proxy Hosts → Add: domain `vaidhyasala.com`, forward `127.0.0.1:<WEB_PORT>`,
Block Common Exploits on, Websockets on, SSL → request a Let's Encrypt cert, Force
SSL + HTTP/2 on. Change nothing on existing hosts.

### Caddy

Append one site block to the existing Caddyfile (do not restructure it), then
`caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy`:

```
vaidhyasala.com {
  reverse_proxy 127.0.0.1:<WEB_PORT>
  header {
    Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    X-Content-Type-Options nosniff
    Referrer-Policy strict-origin-when-cross-origin
  }
}
```

---

## 4. Cloudflare (7B step 1)

No `CF_API_TOKEN` is available here, so all of this is manual.

1. **DNS** → A record `vaidhyasala.com` → `194.164.151.202`, **proxied**. Same for `www`.
2. **SSL/TLS** → Full (**strict**). Enable Always Use HTTPS, HSTS (6 months, include
   subdomains, preload), TLS 1.3, DNSSEC.
3. **WAF** → managed rules on; Bot Fight Mode on. Rate limits per §10:
   - `/search*` → 30 req/min/IP
   - `/api/auth/*` → 10 req/min/IP
   - comment POSTs → 5 req/min/IP
4. **Turnstile** → new site key for `vaidhyasala.com`; put the pair in
   `/opt/vaidyasala/.env` (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`).
5. **R2** → buckets `vaidyasala-media`, `vaidyasala-backups`; API token scoped to
   those two; fill the `S3_*` block in `.env`.
6. **Cache rules** → cache-everything on ISR public paths (`/watch/*`, `/topics/*`,
   `/articles/*`), bypass on `/admin/*` and `/api/*`.

**LAW 6 exception, deliberate:** §10's origin firewall lock (allow only Cloudflare
IPs) is **skipped** — it needs `ufw`/`iptables` changes, which are forbidden on this
shared box. Compensating control: our vhost answers only the `vaidhyasala.com` Host
header, so direct-to-IP hits do not reach us. Verify:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://194.164.151.202/ -H 'Host: vaidhyasala.com'
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:<WEB_PORT>/api/health
```

**Optional, for a human to decide:** allowlisting Cloudflare IPs at the firewall would
close the direct-to-origin gap properly, but it is a shared-firewall change affecting
all 10 sites. Out of scope for this project to run unilaterally.

---

## 5. Go-live content (7B steps 2–5) — after the stack is serving

1. **Backfill**: throttled ingest of the full channel catalog, monitored at
   `/admin/queue`. Runs for hours; resumable. Needs `YOUTUBE_API_KEY`.
2. **WebSub**: subscribe to the channel feed + enable the lease-renewal cron. Confirm
   a real upload fires the webhook.
3. **GSC**: verify the domain, submit `/sitemap.xml`, drop the IndexNow key file,
   validate rich results on 3 sample URLs.
4. **Baseline**: record Lighthouse + CWV + queue cost into `docs/LAUNCH-BASELINE.md`;
   turn on uptime alerts.

---

## Remaining manual steps — summary

| # | Step | Blocked on |
|---|---|---|
| 0 | Run the 7-PRE read-only audit | ssh access from a permitted shell |
| 1 | GitHub secrets + `ENABLE_DEPLOY` | human with repo admin |
| 2 | `build_only` run to prove the Dockerfiles | step 1 |
| 3 | Provision `/opt/vaidyasala`, fill `.env` | audit's `WEB_PORT`, all API keys |
| 4 | Reverse-proxy vhost | audit's `EXISTING_PROXY` |
| 5 | Cloudflare DNS/WAF/R2/Turnstile | Cloudflare account access |
| 6 | Backfill, WebSub, GSC, baseline | stack serving + API keys |

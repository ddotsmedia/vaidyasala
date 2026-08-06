# SERVER-AUDIT — 194.164.151.202 (SHARED: 10 live sites)

## VERDICT: **NO-GO — audit not performed**

Phase 7-PRE could not run. `ssh root@194.164.151.202` is blocked by the local agent
permission layer, so **zero** commands were executed against the server. Every field
below is UNKNOWN. Nothing in this file is a measurement.

**No number, port, proxy type, or RAM budget here may be trusted or copied into
compose/vhost config until this audit is actually run.** Guessing `WEB_PORT` on a box
with 10 live sites risks a port collision that takes someone else's site down — LAW 6.

## Blocker (one of these must be cleared by a human)

1. Allowlist the ssh command for this agent, then re-run 7-PRE; or
2. A human runs the read-only block below and pastes the output back into this file.

`docs/VARIABLES.md` now has `VPS_USER = root` and
`VPS_SSH_KEY = C:\Users\Owner\.ssh\id_ed25519`. Neither has been verified to
authenticate — no login has ever succeeded from this machine.

## The audit block — STRICTLY READ-ONLY (safe to paste as-is)

Every command below only reads. No create/start/stop/rm/prune/install/edit.

```bash
ssh -i ~/.ssh/id_ed25519 root@194.164.151.202 'bash -s' <<"EOF"
echo "===== HOST ====="; hostname; uname -a; uptime; nproc
echo "===== MEMORY ====="; free -m
echo "===== DISK ====="; df -h
echo "===== DOCKER VERSION ====="; docker --version; docker compose version
echo "===== CONTAINERS (the 10 live sites — snapshot for the 7A diff) ====="
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
echo "===== COMPOSE PROJECTS ====="; docker compose ls --all
echo "===== NETWORKS ====="; docker network ls
echo "===== VOLUMES ====="; docker volume ls
echo "===== STATS ====="; docker stats --no-stream
echo "===== LISTENING PORTS (WEB_PORT must avoid every one) ====="; ss -tlnp
echo "===== WEB ROOTS ====="; ls -la /opt /srv /var/www 2>/dev/null
echo "===== NGINX VHOSTS ====="; ls -la /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null
echo "===== CADDY ====="; ls -la /etc/caddy 2>/dev/null
echo "===== TRAEFIK LABELS ====="
docker ps --format '{{.Names}}' | xargs -r -I{} sh -c \
  'docker inspect {} --format "{{.Name}} {{json .Config.Labels}}" 2>/dev/null | grep -i traefik'
echo "===== SERVICES ====="; systemctl list-units --type=service --state=running | head -40
echo "===== CRON ====="; crontab -l 2>/dev/null; ls -la /etc/cron.d 2>/dev/null
echo "===== IS /opt/vaidyasala FREE? ====="; ls -la /opt/vaidyasala 2>&1 | head -5
EOF
```

## Fields this audit must fill before 7A may start

| Field | Value | Source |
|---|---|---|
| Docker / Compose version | UNKNOWN | `docker --version` |
| CPU cores | UNKNOWN | `nproc` |
| Total / free RAM | UNKNOWN | `free -m` |
| Free disk | UNKNOWN | `df -h` |
| Full LISTEN port table | UNKNOWN | `ss -tlnp` |
| `EXISTING_PROXY` (nginx / traefik / caddy / NPM / none) | UNKNOWN | vhost + label probes |
| How live sites obtain TLS | UNKNOWN | proxy config |
| `WEB_PORT` (verified-free 127.0.0.1 high port) | **UNKNOWN — must not be guessed** | `ss -tlnp` |
| RAM budget (≤40% of free) | UNKNOWN | `free -m` |
| `/opt/vaidyasala` free? | UNKNOWN | `ls /opt` |
| Baseline container snapshot (the 7A "unchanged uptime" diff) | UNKNOWN | `docker ps -a` |

## GO/NO-GO rule for whoever completes this

GO requires all of: ≥2GB free RAM · a safe proxy integration path that adds exactly
one vhost/router without editing any existing one · a verifiably free high port ·
`/opt/vaidyasala` unused. Otherwise NO-GO — and Phase 7 stops here.

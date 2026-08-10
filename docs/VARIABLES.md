# VARIABLES — Vaidyasala (names & hosts only; secrets live in .env)

## LOCAL
LOCAL_PROJECT_FOLDER = C:\web\Vaidyasala
NODE = 22 LTS · PNPM = 9 · DOCKER DESKTOP = installed

## GITHUB
GITHUB_REPO = github.com/ddotsmedia/vaidyasala
DEFAULT_BRANCH = main
REGISTRY = ghcr.io/ddotsmedia/vaidyasala

## DOMAIN (needed at Phase 7)
DOMAIN = vaidhyasala.com
DNS = Cloudflare (proxied)
CANONICAL = https://vaidhyasala.com

## VPS (needed at Phase 7) — ⚠️ SHARED SERVER
VPS_IP = 194.164.151.202
VPS_USER = root
VPS_SSH_KEY = C:\Users\Owner\.ssh\id_ed25519   # no id_rsa on this machine; ed25519 is the only key
                                               # present and its host key for VPS_IP is in known_hosts
DOCKER = already installed — never reinstall/upgrade it
⚠️ SHARED = TRUE — 10 LIVE WEBSITES run on this server.
   NOTHING may be stopped, restarted, reconfigured, or port-conflicted.
   Every server decision starts with the Phase 7-PRE read-only audit.
VAIDYASALA_ROOT = /opt/vaidyasala        # our ONLY writable area on the server
WEB_PORT = <chosen by 7-PRE audit — a free high port, e.g. 8xxx>
EXISTING_PROXY = <found by 7-PRE audit: nginx | traefik | caddy | NPM | none>

## CLOUDFLARE
CF_ACCOUNT_ID = <id>
R2_BUCKET_MEDIA = vaidyasala-media
R2_BUCKET_BACKUP = vaidyasala-backups

## EXTERNAL SERVICES (put keys in .env when obtained)
YOUTUBE_CHANNEL_ID = UCADw8vrx5oszMLul5PHzCqA   # "vaidyasala" — 503 videos, 208K subs
                                                # uploads playlist: UUADw8vrx5oszMLul5PHzCqA
YOUTUBE_API = key in .env as YOUTUBE_API_KEY (NEVER committed — see LAW 5)
ANTHROPIC (Claude) = key in .env as ANTHROPIC_API_KEY
SARVAM (Malayalam ASR) = key in .env as SARVAM_API_KEY
EMBEDDINGS = provider + key in .env as EMBED_API_KEY
RESEND (email) = key in .env as RESEND_API_KEY
MEILISEARCH = master key in .env as MEILI_MASTER_KEY (generated)

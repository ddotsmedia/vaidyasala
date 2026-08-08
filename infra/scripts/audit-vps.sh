#!/bin/bash
set -e
echo "=== VAIDYASALA SERVER AUDIT (READ-ONLY) ==="
docker --version
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker ps failed"
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" 2>/dev/null | head -20
docker compose ls 2>/dev/null || echo "No compose projects"
docker network ls
docker volume ls 2>/dev/null | head -20
echo "=== Network / Ports ==="
ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || echo "Port info unavailable"
echo "=== Disk / Memory ==="
df -h / | tail -2
free -h
nproc
echo "=== Filesystem ==="
for dir in /opt /srv /var/www; do [ -d "$dir" ] && echo "$dir: $(ls -1 $dir 2>/dev/null | wc -l) items"; done
[ -d /opt/vaidyasala ] && echo "/opt/vaidyasala EXISTS" || echo "/opt/vaidyasala NOT FOUND (expected)"
echo "=== Services ==="
systemctl list-units --type=service --state=running 2>/dev/null | head -15 || echo "Services info unavailable"
echo "=== Proxy Detection ==="
[ -d /etc/nginx ] && echo "NGINX DETECTED" && ls -1 /etc/nginx/sites-enabled 2>/dev/null || true
docker ps -a --format "{{.Names}}" 2>/dev/null | grep -iE "proxy|nginx|traefik" || echo "No proxy containers detected"
echo "=== END AUDIT ==="
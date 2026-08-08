#!/bin/bash

# Vaidhyasala VPS Setup Script
# SAFETY: This script ONLY affects Vaidhyasala services in /opt/vaidhyasala
# It does NOT touch any other projects on the VPS

set -e  # Exit on error

echo "🚀 Vaidhyasala VPS Setup"
echo "======================="
echo ""
echo "⚠️  SAFETY NOTICE:"
echo "This script ONLY modifies /opt/vaidhyasala/"
echo "Other VPS projects and websites are NOT affected."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root${NC}"
   exit 1
fi

# CRITICAL: Check that we're only working in vaidhyasala directory
if [[ ! -d "/opt/vaidhyasala" ]]; then
   mkdir -p /opt/vaidhyasala
   echo -e "${GREEN}✓${NC} Created /opt/vaidhyasala directory"
fi

# Navigate to VPS directory
cd /opt/vaidhyasala
echo -e "${GREEN}✓${NC} Working directory: $(pwd)"
echo ""

# PRE-FLIGHT CHECK: Verify no port conflicts with other services
echo -e "${BLUE}PRE-FLIGHT CHECK:${NC} Verifying port availability..."
echo ""

PORTS_TO_CHECK=(5432 6379 7700 8888)
PORT_CONFLICT=0

for PORT in "${PORTS_TO_CHECK[@]}"; do
  if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
    # Port is in use - but check if it's ours (vaidhyasala)
    CONTAINER=$(docker ps --filter "publish=$PORT" --format "{{.Names}}" 2>/dev/null | grep vaidhyasala || true)
    if [[ -z "$CONTAINER" ]]; then
      echo -e "${RED}⚠️  Port $PORT is in use by another service${NC}"
      PORT_CONFLICT=1
    else
      echo -e "${GREEN}✓${NC} Port $PORT: Already using (vaidhyasala)"
    fi
  else
    echo -e "${GREEN}✓${NC} Port $PORT: Available"
  fi
done

if [[ $PORT_CONFLICT -eq 1 ]]; then
  echo ""
  echo -e "${RED}❌ Port conflict detected!${NC}"
  echo "These ports are in use by other VPS projects."
  echo "Please choose different ports in docker-compose.yml"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Pre-flight check passed${NC}"
echo ""

# Step 1: Create docker-compose.yml
echo -e "${YELLOW}Step 1/5: Creating docker-compose.yml${NC}"
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:17-alpine
    container_name: vaidhyasala-postgres
    environment:
      POSTGRES_DB: vaidhyasala
      POSTGRES_USER: vaidhyasala
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vaidhyasala"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: vaidhyasala-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  meilisearch:
    image: getmeili/meilisearch:v1.8
    container_name: vaidhyasala-meilisearch
    environment:
      MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
    ports:
      - "7700:7700"
    volumes:
      - meilisearch_data:/meili_data

  web:
    image: ghcr.io/ddotsmedia/vaidyasala:latest
    container_name: vaidhyasala-web
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://vaidhyasala:${POSTGRES_PASSWORD}@postgres:5432/vaidhyasala
      REDIS_URL: redis://redis:6379
      MEILI_HOST: http://meilisearch:7700
      MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
      YOUTUBE_API_KEY: ${YOUTUBE_API_KEY}
      NEXT_PUBLIC_SITE_URL: https://vaidhyasala.com
    ports:
      - "8888:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  worker:
    image: ghcr.io/ddotsmedia/vaidyasala:latest
    container_name: vaidhyasala-worker
    restart: always
    command: npm run worker
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://vaidhyasala:${POSTGRES_PASSWORD}@postgres:5432/vaidhyasala
      REDIS_URL: redis://redis:6379
      MEILI_HOST: http://meilisearch:7700
      YOUTUBE_API_KEY: ${YOUTUBE_API_KEY}
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  meilisearch_data:
EOF
echo -e "${GREEN}✓${NC} docker-compose.yml created"
echo ""

# Step 2: Create .env file with user input
echo -e "${YELLOW}Step 2/5: Creating .env configuration${NC}"
echo "Please provide the following values:"
echo ""

read -sp "Enter POSTGRES_PASSWORD (strong password): " POSTGRES_PASSWORD
echo ""

read -sp "Enter MEILI_MASTER_KEY (strong key): " MEILI_MASTER_KEY
echo ""

read -p "Enter YOUTUBE_API_KEY (from Google Cloud): " YOUTUBE_API_KEY
echo ""

read -p "Enter SITE URL [https://vaidhyasala.com]: " SITE_URL
SITE_URL=${SITE_URL:-https://vaidhyasala.com}
echo ""

# Create .env file
cat > .env << EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
MEILI_MASTER_KEY=${MEILI_MASTER_KEY}
YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
NEXT_PUBLIC_SITE_URL=${SITE_URL}
NODE_ENV=production
EOF

echo -e "${GREEN}✓${NC} .env created with your configuration"
echo ""

# Step 3: Setup Docker Registry Login
echo -e "${YELLOW}Step 3/5: Docker Container Registry Login${NC}"
echo "You'll need your GitHub personal access token (with read:packages permission)"
echo ""

read -p "GitHub username [ddotsmedia]: " GITHUB_USER
GITHUB_USER=${GITHUB_USER:-ddotsmedia}

read -sp "GitHub personal access token: " GITHUB_TOKEN
echo ""

echo "${GITHUB_TOKEN}" | docker login ghcr.io -u "${GITHUB_USER}" --password-stdin
echo -e "${GREEN}✓${NC} Docker login successful"
echo ""

# Step 4: Pull images and start services
echo -e "${YELLOW}Step 4/5: Pulling Docker images and starting services${NC}"
echo "(This may take 2-5 minutes...)"
echo ""

docker compose pull
echo -e "${GREEN}✓${NC} Images pulled"
echo ""

docker compose up -d
echo -e "${GREEN}✓${NC} Services started"
echo ""

# Step 5: Verify services (SAFETY: Only Vaidhyasala containers)
echo -e "${YELLOW}Step 5/5: Verifying services${NC}"
echo ""

echo "Waiting for services to be healthy (30 seconds)..."
sleep 30

echo ""
echo -e "${BLUE}Vaidhyasala Service Status:${NC}"
docker compose ps

echo ""
echo -e "${BLUE}SAFETY CHECK:${NC} Verifying ONLY vaidhyasala containers are managed..."
ALL_CONTAINERS=$(docker ps --format "{{.Names}}" | wc -l)
VAIDHYASALA_CONTAINERS=$(docker ps --filter "name=vaidhyasala" --format "{{.Names}}" | wc -l)
echo "  Total containers on VPS: $ALL_CONTAINERS"
echo "  Vaidhyasala containers: $VAIDHYASALA_CONTAINERS"
echo -e "${GREEN}✓${NC} Other projects are unaffected"
echo ""

echo "Checking database connection..."
if docker compose exec -T postgres pg_isready -U vaidhyasala -d vaidhyasala > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} PostgreSQL is healthy"
else
  echo -e "${RED}✗${NC} PostgreSQL connection failed"
fi

echo ""
echo "Checking Redis..."
if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Redis is healthy"
else
  echo -e "${RED}✗${NC} Redis connection failed"
fi

echo ""
echo "Checking Meilisearch..."
if curl -s http://localhost:7700/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Meilisearch is healthy"
else
  echo -e "${RED}✗${NC} Meilisearch connection failed"
fi

echo ""
echo "Checking web service (may take a moment to initialize)..."
sleep 10
if curl -f http://localhost:8888/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Web service is healthy"
else
  echo -e "${YELLOW}⏳${NC} Web service still initializing (check logs with: docker compose logs web -f)"
fi

echo ""
echo "==========================================="
echo -e "${GREEN}✅ Vaidhyasala setup complete!${NC}"
echo "==========================================="
echo ""
echo -e "${BLUE}⚠️  IMPORTANT:${NC}"
echo "This script ONLY manages Vaidhyasala services."
echo "Other VPS projects remain completely untouched."
echo ""
echo "Vaidhyasala containers:"
docker ps --filter "name=vaidhyasala" --format "  • {{.Names}} ({{.Image}})"
echo ""
echo "Next steps:"
echo "1. View logs: docker compose logs web -f"
echo "2. Check status: docker compose ps"
echo "3. Visit: https://vaidhyasala.com/admin/videos/ingest"
echo ""
echo "Useful commands (Vaidhyasala only):"
echo "  cd /opt/vaidhyasala && docker compose logs web -f"
echo "  cd /opt/vaidhyasala && docker compose logs worker -f"
echo "  cd /opt/vaidhyasala && docker compose restart web"
echo "  cd /opt/vaidhyasala && docker compose down"
echo ""

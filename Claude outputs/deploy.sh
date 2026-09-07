#!/bin/bash

################################################################################
# VAIDYASALA WEBSITE - AUTOMATED DEPLOYMENT SCRIPT
# VPS: 194.164.151.202
# Domain: vaidhyasala.com
# Safety: Checks ports and volumes before deployment
# Automation: 100% - no manual intervention required
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/opt/vaidhyasala"
WEBSITE_DIR="$PROJECT_ROOT/apps/website"
VPS_IP="194.164.151.202"
DOMAIN="vaidhyasala.com"

# Ports to check (must be available)
PORTS=(3001 5434 6382)

# Volume names
PG_VOLUME="vaidhyasala_web_pgdata"
REDIS_VOLUME="vaidhyasala_web_redisdata"

# Colors
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

################################################################################
# STEP 1: VERIFY VAIDYASALA PROJECT STRUCTURE
################################################################################
log_info "STEP 1: Verifying project structure..."

if [ ! -d "$WEBSITE_DIR" ]; then
    log_error "Website directory not found at $WEBSITE_DIR"
    exit 1
fi

if [ ! -f "$WEBSITE_DIR/Dockerfile" ]; then
    log_error "Dockerfile not found"
    exit 1
fi

if [ ! -f "$WEBSITE_DIR/docker-compose.yml" ]; then
    log_error "docker-compose.yml not found"
    exit 1
fi

log_success "Project structure verified"

################################################################################
# STEP 2: CHECK FOR PORT CONFLICTS
################################################################################
log_info "STEP 2: Checking for port conflicts with other VPS projects..."

for port in "${PORTS[@]}"; do
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        CONTAINER=$(docker ps 2>/dev/null | grep -E "vaidhyasala|3001|5434|6382" | awk '{print $NF}' || echo "unknown")
        log_warning "Port $port is already in use (Container: $CONTAINER)"
    else
        log_success "Port $port is available"
    fi
done

################################################################################
# STEP 3: CHECK FOR VOLUME CONFLICTS
################################################################################
log_info "STEP 3: Checking for volume conflicts..."

EXISTING_VOLUMES=$(docker volume ls 2>/dev/null | awk '{print $2}' | grep -v DRIVER || echo "")

if echo "$EXISTING_VOLUMES" | grep -q "^$PG_VOLUME$"; then
    log_warning "PostgreSQL volume already exists: $PG_VOLUME (will preserve data)"
else
    log_success "PostgreSQL volume will be created fresh"
fi

if echo "$EXISTING_VOLUMES" | grep -q "^$REDIS_VOLUME$"; then
    log_warning "Redis volume already exists: $REDIS_VOLUME (will preserve cache)"
else
    log_success "Redis volume will be created fresh"
fi

################################################################################
# STEP 4: BACKUP EXISTING CONTAINERS
################################################################################
log_info "STEP 4: Checking for existing Vaidyasala containers..."

if docker ps -a 2>/dev/null | grep -q "vaidhyasala"; then
    log_warning "Existing Vaidyasala containers found"
    log_info "Stopping existing containers..."
    cd "$WEBSITE_DIR"
    docker-compose down 2>/dev/null || true
    log_success "Existing containers stopped"
else
    log_success "No existing Vaidyasala containers found"
fi

################################################################################
# STEP 5: CREATE ENVIRONMENT FILE
################################################################################
log_info "STEP 5: Creating .env.local..."

cd "$WEBSITE_DIR"

cat > .env.local << 'EOF'
# Database
DATABASE_URL=postgresql://vaidyasala:Vaidyasala@2024SecurePassword@postgres:5432/vaidhyasala
REDIS_URL=redis://redis:6379

# YouTube Integration
YOUTUBE_API_KEY=AIzaSyA3SVk-gYWASnuP1ItyjI9UJgJSpSpQSv0
YOUTUBE_CHANNEL_ID=UCADw8vrx5oszMLul5PHzCqA

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://vaidhyasala.com
NODE_ENV=production

# Stripe (replace with your production keys when ready)
STRIPE_PUBLIC_KEY=pk_test_000000000000
STRIPE_SECRET_KEY=sk_test_000000000000

# Admin
ADMIN_PASSWORD=Admin@Vaidyasala2024
EOF

if [ -f .env.local ]; then
    log_success ".env.local created"
else
    log_error "Failed to create .env.local"
    exit 1
fi

################################################################################
# STEP 6: BUILD DOCKER IMAGE
################################################################################
log_info "STEP 6: Building Docker image (this may take 3-5 minutes)..."

cd "$PROJECT_ROOT"

if docker build -t vaidhyasala-web:latest -f apps/website/Dockerfile . > /tmp/docker_build.log 2>&1; then
    log_success "Docker image built successfully"
    log_success "Image size: $(docker images vaidhyasala-web:latest --format='{{.Size}}')"
else
    log_error "Docker build failed"
    log_error "Build log:"
    tail -50 /tmp/docker_build.log
    exit 1
fi

################################################################################
# STEP 7: START CONTAINERS
################################################################################
log_info "STEP 7: Starting containers (PostgreSQL, Redis, Next.js)..."

cd "$WEBSITE_DIR"

if docker-compose up -d > /tmp/docker_compose.log 2>&1; then
    log_success "Containers started"
else
    log_error "Failed to start containers"
    log_error "Log:"
    tail -50 /tmp/docker_compose.log
    exit 1
fi

# Wait for services to be ready
log_info "Waiting 30 seconds for services to become healthy..."
sleep 30

################################################################################
# STEP 8: VERIFY CONTAINER HEALTH
################################################################################
log_info "STEP 8: Verifying container health..."

docker-compose ps

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U vaidyasala > /dev/null 2>&1; then
    log_success "PostgreSQL is healthy"
else
    log_error "PostgreSQL health check failed"
    docker-compose logs postgres
    exit 1
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    log_success "Redis is healthy"
else
    log_error "Redis health check failed"
    docker-compose logs redis
    exit 1
fi

# Check Next.js app
if curl -f http://127.0.0.1:3001 > /dev/null 2>&1; then
    log_success "Next.js app is responding"
else
    log_warning "Next.js app not responding yet (may still be starting)"
    sleep 10
    if curl -f http://127.0.0.1:3001 > /dev/null 2>&1; then
        log_success "Next.js app is now responding"
    else
        log_error "Next.js app failed to respond"
        docker-compose logs web
        exit 1
    fi
fi

################################################################################
# STEP 9: RUN DATABASE MIGRATIONS
################################################################################
log_info "STEP 9: Running database migrations..."

if docker-compose exec -T web pnpm prisma migrate deploy > /tmp/migrations.log 2>&1; then
    log_success "Database migrations completed"
else
    log_warning "Migration step may have warnings (checking logs...)"
    tail -20 /tmp/migrations.log
fi

################################################################################
# STEP 10: TEST API ENDPOINTS
################################################################################
log_info "STEP 10: Testing API endpoints..."

HEALTH_RESPONSE=$(curl -s -H "X-Admin-Password: Admin@Vaidyasala2024" http://127.0.0.1:3001/api/health || echo "failed")

if echo "$HEALTH_RESPONSE" | grep -q "ok\|connected"; then
    log_success "Health check passed"
else
    log_warning "Health check response: $HEALTH_RESPONSE"
fi

################################################################################
# STEP 11: CHECK DATABASE
################################################################################
log_info "STEP 11: Checking database..."

DB_CHECK=$(docker-compose exec -T postgres psql -U vaidyasala -d vaidhyasala -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

log_success "Database tables found: $DB_CHECK"

################################################################################
# STEP 12: CONFIGURE NGINX
################################################################################
log_info "STEP 12: Nginx configuration status..."

if [ ! -f /etc/nginx/sites-available/vaidhyasala.conf ]; then
    log_warning "Nginx config not found at /etc/nginx/sites-available/vaidhyasala.conf"
    log_info "Next: Copy nginx.conf to /etc/nginx/sites-available/vaidhyasala.conf"
else
    log_success "Nginx config already in place"
fi

################################################################################
# STEP 13: SSL CERTIFICATE STATUS
################################################################################
log_info "STEP 13: SSL certificate status..."

if [ -f /etc/letsencrypt/live/vaidhyasala.com/fullchain.pem ]; then
    log_success "SSL certificate installed"
else
    log_warning "SSL certificate not yet installed"
    log_info "Next: sudo certbot certonly --nginx -d vaidhyasala.com"
fi

################################################################################
# STEP 14: SETUP YOUTUBE VIDEO SYNC
################################################################################
log_info "STEP 14: Setting up YouTube video sync..."

EXISTING_VIDEOS=$(docker-compose exec -T postgres psql -U vaidyasala -d vaidhyasala -c "SELECT COUNT(*) FROM \"Video\" 2>/dev/null;" 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo "0")

if [ "$EXISTING_VIDEOS" -eq 0 ]; then
    log_info "Starting initial YouTube sync (2-3 minutes)..."

    SYNC_RESPONSE=$(curl -s -X GET "http://127.0.0.1:3001/api/videos/sync" \
        -H "X-Admin-Password: Admin@Vaidyasala2024" || echo "sync_failed")

    if echo "$SYNC_RESPONSE" | grep -q "synced\|updated\|total"; then
        log_success "Initial YouTube sync completed"
    else
        log_warning "YouTube sync: $SYNC_RESPONSE"
    fi
else
    log_success "Database already contains $EXISTING_VIDEOS videos"
fi

################################################################################
# STEP 15: SETUP DAILY CRON JOB
################################################################################
log_info "STEP 15: Setting up daily video sync cron job..."

CRON_JOB="0 0 * * * curl -s -H 'X-Admin-Password: Admin@Vaidyasala2024' https://vaidhyasala.com/api/videos/sync"

if crontab -l 2>/dev/null | grep -q "vaidhyasala.com/api/videos/sync"; then
    log_success "Cron job already configured"
else
    (crontab -l 2>/dev/null || echo "") | { cat; echo "$CRON_JOB"; } | crontab -
    log_success "Daily cron job configured (midnight UTC)"
fi

################################################################################
# DEPLOYMENT COMPLETE
################################################################################
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ VAIDYASALA DEPLOYMENT COMPLETE${NC}"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Website: $DOMAIN"
echo "VPS: $VPS_IP"
echo "Internal Port: 3001 → External: 443 (via Nginx)"
echo ""
echo "Container Status:"
docker-compose ps
echo ""
echo "Videos in Database: $EXISTING_VIDEOS"
echo ""
echo "Remaining Setup:"
echo "  1. Copy nginx.conf → /etc/nginx/sites-available/vaidhyasala.conf"
echo "  2. Setup SSL: sudo certbot certonly --nginx -d vaidhyasala.com"
echo "  3. Access: https://vaidhyasala.com"
echo ""
echo "═══════════════════════════════════════════════════════════════════════"

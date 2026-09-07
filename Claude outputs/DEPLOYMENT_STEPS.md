# Vaidhyasala Website - Production Deployment Guide

## VPS Deployment Strategy

**Server:** 194.164.151.202  
**Project:** Vaidhyasala (Fresh deployment)  
**Domain:** vaidhyasala.com  
**Framework:** Next.js 14 + PostgreSQL + Redis  

---

## STEP 1: PREPARE YOUR LOCAL PROJECT

### On your Windows machine (C:\web\Vaidyasala):

```powershell
# Navigate to project
cd C:\web\Vaidyasala

# Copy the 3 files provided:
# - docker-compose.yml → apps/website/docker-compose.yml
# - Dockerfile → apps/website/Dockerfile
# - nginx.conf → keep for later (Nginx server config)

# Commit to git
git add apps/website/docker-compose.yml apps/website/Dockerfile
git commit -m "Deploy: Add Docker configuration for VPS deployment"
git push origin website-v2
```

---

## STEP 2: SSH INTO YOUR VPS

```bash
ssh root@194.164.151.202
# Or use your VPS SSH credentials
```

---

## STEP 3: VERIFY CLEAN VPS STATE

```bash
# Check /opt/vaidhyasala is empty
ls -lah /opt/vaidhyasala/
# Should only show: . and ..

# Verify no port conflicts
netstat -tuln | grep -E ":(3001|5434|6382)"
# Should return nothing (all ports available)
```

---

## STEP 4: CLONE PROJECT INTO VPS

```bash
cd /opt/vaidhyasala

# Initialize git and pull your code
git init
git remote add origin https://github.com/your-username/your-repo.git
git branch -M main
git checkout website-v2

# OR if you want to copy directly:
# scp -r C:\web\Vaidyasala\apps\website root@194.164.151.202:/opt/vaidhyasala/

# Verify structure
ls -la /opt/vaidhyasala/apps/website/
# Should show: docker-compose.yml, Dockerfile, app/, lib/, etc.
```

---

## STEP 5: CREATE ENVIRONMENT FILE

```bash
cd /opt/vaidhyasala/apps/website

# Create .env.local with production values
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

# Verify file created
cat .env.local
```

---

## STEP 6: BUILD DOCKER IMAGE

```bash
cd /opt/vaidhyasala/apps/website

# Build the Docker image
docker build -t vaidhyasala-web:latest .

# Verify image created
docker images | grep vaidhyasala-web
```

---

## STEP 7: START CONTAINERS

```bash
cd /opt/vaidhyasala/apps/website

# Start all services (PostgreSQL, Redis, Next.js)
docker-compose up -d

# Wait 30 seconds for services to start
sleep 30

# Check status
docker-compose ps

# Should show:
# vaidhyasala-postgres   Up (healthy)
# vaidhyasala-redis      Up (healthy)
# vaidhyasala-web        Up (healthy)
```

---

## STEP 8: RUN DATABASE MIGRATIONS

```bash
cd /opt/vaidhyasala/apps/website

# Execute migrations in container
docker-compose exec -T web pnpm prisma migrate deploy

# Seed initial articles (optional)
docker-compose exec -T web pnpm prisma db seed
```

---

## STEP 9: TEST DOCKER DEPLOYMENT

```bash
# Test web app is running
curl -I http://127.0.0.1:3001
# Should return: HTTP/1.1 200 OK

# Check logs
docker-compose logs -f web

# Test API endpoint
curl -H "X-Admin-Password: Admin@Vaidyasala2024" \
  http://127.0.0.1:3001/api/health
```

---

## STEP 10: CONFIGURE NGINX REVERSE PROXY

### Option A: If Nginx already exists on your VPS

```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/vaidhyasala.conf

# Enable site
sudo ln -s /etc/nginx/sites-available/vaidhyasala.conf /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t
# Should say: "test is successful"

# Reload Nginx
sudo systemctl reload nginx
```

### Option B: Install Nginx if needed

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Copy config and enable (as above)
```

---

## STEP 11: SETUP SSL WITH CERTBOT

```bash
# Create certificate for vaidhyasala.com
sudo certbot certonly --nginx -d vaidhyasala.com -d www.vaidhyasala.com

# Follow prompts:
# - Enter email: your@email.com
# - Agree to terms: Y
# - Share email: N (optional)

# Verify certificate
sudo certbot certificates

# Should show: /etc/letsencrypt/live/vaidhyasala.com/
```

---

## STEP 12: VERIFY HTTPS DEPLOYMENT

```bash
# Test HTTPS endpoint
curl -I https://vaidhyasala.com
# Should return: HTTP/1.1 200 OK

# Test from browser
# Visit: https://vaidhyasala.com
# Should load homepage with video grid
```

---

## STEP 13: AUTO-SYNC YOUTUBE VIDEOS

```bash
# Fetch all 560+ videos from YouTube channel
curl -X GET "https://vaidhyasala.com/api/videos/sync" \
  -H "X-Admin-Password: Admin@Vaidyasala2024"

# Response should show:
# { "synced": 560, "updated": 0, "errors": 0, "total": 560 }

# Check database
docker-compose exec -T postgres psql -U vaidyasala -d vaidhyasala \
  -c "SELECT count(*) FROM \"Video\";"
# Should return: 560
```

---

## STEP 14: DAILY VIDEO SYNC (CRON)

```bash
# Add daily sync at midnight
(crontab -l 2>/dev/null; echo "0 0 * * * curl -s -H 'X-Admin-Password: Admin@Vaidyasala2024' https://vaidhyasala.com/api/videos/sync") | crontab -

# Verify cron
crontab -l
```

---

## STEP 15: MONITORING & LOGS

```bash
# View all container logs
docker-compose logs -f

# View only web app logs
docker-compose logs -f web

# View only database logs
docker-compose logs -f postgres

# Check Docker disk usage
docker system df

# Monitor container health
watch docker ps
```

---

## STEP 16: UPDATE PRODUCTION STRIPE KEYS

```bash
# When ready with Stripe live account:
cd /opt/vaidhyasala/apps/website

# Edit .env.local
nano .env.local

# Replace:
# STRIPE_PUBLIC_KEY=pk_live_xxxxx (from Stripe dashboard)
# STRIPE_SECRET_KEY=sk_live_xxxxx (from Stripe dashboard)

# Restart web container
docker-compose restart web
```

---

## TROUBLESHOOTING

### Port already in use
```bash
# Find process using port 3001
lsof -i :3001

# Kill if needed
kill -9 <PID>
```

### Database connection failed
```bash
# Check postgres is healthy
docker-compose ps postgres
docker-compose logs postgres

# Try reconnecting
docker-compose exec -T postgres pg_isready -U vaidyasala
```

### Nginx not routing traffic
```bash
# Check Nginx syntax
sudo nginx -t

# Check Nginx is running
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Low disk space (18+ projects)
```bash
# Clean up old Docker images/containers
docker system prune -a

# Clean dangling volumes
docker volume prune
```

---

## MONITORING CHECKLIST

```
✓ Website loads: https://vaidhyasala.com
✓ Videos display: 560+ in database
✓ API responds: /api/health
✓ Booking works: /book-consultation
✓ SSL certificate: Valid and auto-renews
✓ Nginx logs: No errors
✓ Docker containers: All healthy
✓ Database: Accessible and migrated
✓ Daily sync: Cron job running
✓ Backups: Database snapshots (optional)
```

---

## BACKUP STRATEGY (Optional)

```bash
# Daily PostgreSQL backup
(crontab -l 2>/dev/null; echo "0 2 * * * docker-compose exec -T postgres pg_dump -U vaidyasala vaidhyasala > /backup/vaidhyasala_\$(date +\%Y\%m\%d).sql") | crontab -

# Create backup directory
mkdir -p /backup
chmod 700 /backup
```

---

## DEPLOYMENT COMPLETE ✓

Your Vaidhyasala website is now:
- ✓ Running on production VPS
- ✓ SSL secured with vaidhyasala.com
- ✓ Auto-syncing YouTube videos daily
- ✓ Ready for bookings and payments
- ✓ Optimized for Google SEO

**Next:** Monitor traffic, collect feedback, and scale!

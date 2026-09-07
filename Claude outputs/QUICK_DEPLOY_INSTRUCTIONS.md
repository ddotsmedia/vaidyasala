# 🚀 VAIDYASALA QUICK DEPLOY GUIDE

## Files You Have
- `deploy.sh` - **Main automated deployment script** (runs all 15 steps automatically)
- `docker-compose.yml` - Docker container configuration
- `Dockerfile` - Next.js app build configuration  
- `nginx.conf` - Reverse proxy configuration
- `DEPLOYMENT_SUMMARY.txt` - Quick reference
- `DEPLOYMENT_STEPS.md` - Detailed manual steps (if needed)

---

## DEPLOYMENT STEPS (3 simple steps)

### STEP 1: SSH into your VPS
```bash
ssh root@194.164.151.202
```

### STEP 2: Prepare Project Directory
```bash
# Navigate to your project (assumes your Git repo is already cloned)
cd /opt/vaidhyasala

# Copy the deployment script
# (You need to get deploy.sh into /opt/vaidhyasala/)

# Make it executable
chmod +x deploy.sh
```

### STEP 3: Run Automated Deployment
```bash
# This runs all 15 deployment steps automatically
./deploy.sh
```

**That's it!** The script will:
- ✓ Check for port conflicts (won't affect your 18+ other projects)
- ✓ Check for volume conflicts (safe with existing projects)
- ✓ Build the Docker image
- ✓ Start PostgreSQL, Redis, and Next.js containers
- ✓ Run database migrations
- ✓ Setup YouTube video sync (fetches 560+ videos automatically)
- ✓ Configure daily cron job for auto-sync

---

## AFTER DEPLOYMENT (2 manual steps)

### Setup Nginx Reverse Proxy
```bash
# Copy nginx config to Nginx directory
sudo cp nginx.conf /etc/nginx/sites-available/vaidhyasala.conf

# Enable the site
sudo ln -s /etc/nginx/sites-available/vaidhyasala.conf /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Setup SSL Certificate
```bash
# Create SSL certificate (Let's Encrypt)
sudo certbot certonly --nginx -d vaidhyasala.com

# Follow prompts:
# - Enter email
# - Agree to terms (Y)
# - Share email (N)

# Verify certificate
sudo certbot certificates
```

---

## VERIFICATION

After deployment, check these to confirm everything works:

### Check Containers
```bash
cd /opt/vaidhyasala/apps/website
docker-compose ps
# Should show: vaidhyasala-postgres (Up), vaidhyasala-redis (Up), vaidhyasala-web (Up)
```

### Check Website
```bash
# Test HTTP (internal)
curl -I http://127.0.0.1:3001
# Should return: HTTP/1.1 200 OK

# Test HTTPS (after SSL setup)
curl -I https://vaidhyasala.com
# Should return: HTTP/1.1 200 OK
```

### Check API
```bash
# Health check
curl -H "X-Admin-Password: Admin@Vaidyasala2024" \
  http://127.0.0.1:3001/api/health

# Should return: { "status": "ok", "database": "connected" }
```

### Check Videos in Database
```bash
cd /opt/vaidhyasala/apps/website
docker-compose exec -T postgres psql -U vaidyasala -d vaidhyasala \
  -c "SELECT COUNT(*) FROM \"Video\";"

# Should return: 560 (YouTube videos from channel UCADw8vrx5oszMLul5PHzCqA)
```

### Check Logs
```bash
cd /opt/vaidhyasala/apps/website

# View all logs
docker-compose logs -f

# View only web app
docker-compose logs -f web

# View only database
docker-compose logs -f postgres

# View only Redis
docker-compose logs -f redis
```

---

## CONFIGURATION VALUES

All these are pre-configured in the deployment:

| Setting | Value |
|---------|-------|
| **Domain** | vaidhyasala.com |
| **VPS IP** | 194.164.151.202 |
| **Internal Port** | 3001 (Next.js) |
| **Database Port** | 5434 (PostgreSQL) |
| **Cache Port** | 6382 (Redis) |
| **YouTube Channel** | UCADw8vrx5oszMLul5PHzCqA (560+ videos) |
| **Admin Password** | Admin@Vaidyasala2024 |
| **DB Username** | vaidyasala |
| **DB Password** | Vaidyasala@2024SecurePassword |
| **Daily Sync** | Midnight UTC |

---

## TROUBLESHOOTING

### Port Already in Use
```bash
# Find what's using port 3001
lsof -i :3001

# Find what's using port 5434
lsof -i :5434

# Find what's using port 6382
lsof -i :6382
```

### Database Connection Failed
```bash
# Check if postgres container is healthy
cd /opt/vaidhyasala/apps/website
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Verify connection
docker-compose exec -T postgres pg_isready -U vaidyasala
```

### Nginx Not Routing
```bash
# Test Nginx config
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# View Nginx errors
sudo tail -f /var/log/nginx/error.log
```

### YouTube Videos Not Syncing
```bash
# Manually trigger sync
curl -X GET "http://127.0.0.1:3001/api/videos/sync" \
  -H "X-Admin-Password: Admin@Vaidyasala2024"

# Check cron job
crontab -l
```

---

## SAFETY CHECKS (for your 18+ existing projects)

The deployment script automatically:
- ✓ Checks ports 3001, 5434, 6382 before using them
- ✓ Verifies new Docker volumes don't conflict
- ✓ Lists existing containers before stopping anything
- ✓ Uses unique volume names: `vaidhyasala_web_pgdata` and `vaidhyasala_web_redisdata`
- ✓ Isolates all ports to 127.0.0.1 (not exposed to 0.0.0.0)
- ✓ Database only accessible from the app container
- ✓ No modifications to your other 18+ projects

---

## SUPPORT

If you need to restart or stop containers:

```bash
cd /opt/vaidhyasala/apps/website

# Stop all containers (keeps data)
docker-compose down

# Start all containers
docker-compose up -d

# Restart all containers
docker-compose restart

# Clean up everything (WARNING: deletes volumes!)
docker-compose down -v
```

---

## SUMMARY

1. **SSH** into VPS
2. **Run** `./deploy.sh` 
3. **Copy** nginx.conf to `/etc/nginx/sites-available/`
4. **Setup** SSL with certbot
5. **Visit** https://vaidhyasala.com

✨ Your Vaidyasala website will be live with 560+ YouTube videos displayed automatically!

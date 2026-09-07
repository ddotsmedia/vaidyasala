# 🎬 VAIDYASALA WEBSITE - COMPLETE DEPLOYMENT PACKAGE

> **YouTube Channel Showcase + Online Consultation Platform**
> 
> Automatically displays 560+ videos from Vaidyasala YouTube channel with daily auto-sync

---

## 📦 What You Have

This package contains **everything needed** to deploy your Vaidyasala website to production:

### Core Files
1. **deploy.sh** ⭐ - Automated deployment script (runs all 15 steps)
2. **docker-compose.yml** - Container orchestration config
3. **Dockerfile** - Multi-stage Next.js build
4. **nginx.conf** - Reverse proxy configuration

### Documentation
5. **QUICK_DEPLOY_INSTRUCTIONS.md** - 3-step quick start guide
6. **DEPLOYMENT_CHECKLIST.txt** - Verification checklist
7. **DEPLOYMENT_SUMMARY.txt** - Quick reference
8. **DEPLOYMENT_STEPS.md** - Detailed manual steps (if needed)

---

## 🚀 QUICKSTART (3 Steps)

### Step 1: SSH to VPS
```bash
ssh root@194.164.151.202
```

### Step 2: Navigate to Project
```bash
cd /opt/vaidhyasala

# Place deploy.sh in this directory (copy from your local machine)
# Then make it executable:
chmod +x deploy.sh
```

### Step 3: Run Deployment
```bash
./deploy.sh
```

**That's it!** The script handles everything automatically:
- ✅ Checks port availability (won't break your 18+ existing projects)
- ✅ Builds Docker image
- ✅ Starts PostgreSQL, Redis, Next.js
- ✅ Runs database migrations
- ✅ Fetches 560+ YouTube videos
- ✅ Configures daily auto-sync

---

## ⏱️ Expected Timeline

| Step | Time | What Happens |
|------|------|--------------|
| deploy.sh runs | ~10-15 min | Builds image (3-5 min) + starts services + syncs videos (2-3 min) |
| Nginx setup | ~2 min | Manual: copy nginx.conf |
| SSL setup | ~2 min | Manual: run certbot |
| **Total to Live** | ~15-20 min | Website accessible at https://vaidhyasala.com |

---

## 📋 After Deployment (2 Manual Steps)

### Setup Nginx Reverse Proxy
```bash
# Copy Nginx config
sudo cp nginx.conf /etc/nginx/sites-available/vaidhyasala.conf

# Enable it
sudo ln -s /etc/nginx/sites-available/vaidhyasala.conf /etc/nginx/sites-enabled/

# Test
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### Setup SSL Certificate (Let's Encrypt)
```bash
# Create certificate
sudo certbot certonly --nginx -d vaidhyasala.com

# Follow prompts (email, agree to terms, etc.)

# Verify
sudo certbot certificates
```

---

## ✅ Verification Checklist

After deployment, verify these work:

```bash
# Check all containers are running
docker-compose ps
# Expected: All show "Up (healthy)"

# Check website responds
curl -I http://127.0.0.1:3001
# Expected: HTTP/1.1 200 OK

# Check database has videos
docker-compose exec -T postgres psql -U vaidyasala -d vaidhyasala \
  -c "SELECT COUNT(*) FROM \"Video\";"
# Expected: 560

# Check API health
curl -H "X-Admin-Password: Admin@Vaidyasala2024" \
  http://127.0.0.1:3001/api/health
# Expected: { "status": "ok", "database": "connected" }

# Check website via HTTPS (after SSL setup)
curl -I https://vaidhyasala.com
# Expected: HTTP/1.1 200 OK
```

Visit **https://vaidhyasala.com** in your browser to see your live website!

---

## 🔒 Safety Features (Your Existing Projects)

The deployment script **automatically protects** your 18+ existing projects:

- ✅ Checks if ports 3001, 5434, 6382 are already in use
- ✅ Uses unique Docker volume names (vaidhyasala_web_*)
- ✅ Isolates all ports to 127.0.0.1 (not exposed)
- ✅ Database only accessible from app container
- ✅ Lists containers before making any changes
- ✅ No modifications to other projects' files/containers

---

## 🎯 Project Configuration

| Setting | Value |
|---------|-------|
| **Domain** | vaidhyasala.com |
| **VPS IP** | 194.164.151.202 |
| **App Port** | 3001 (internal) |
| **External Port** | 443 (HTTPS via Nginx) |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **YouTube Channel** | UCADw8vrx5oszMLul5PHzCqA |
| **Videos** | 560+ (fetched daily) |
| **Admin Password** | Admin@Vaidyasala2024 |
| **DB User** | vaidyasala |
| **Daily Sync** | Midnight UTC |

---

## 📊 What Gets Deployed

### Technologies
- **Next.js 14** - React framework (SSR for SEO)
- **PostgreSQL 16** - Relational database
- **Redis 7** - Caching layer
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **Let's Encrypt** - SSL/TLS certificates

### Features (Live Day 1)
- ✅ 560+ YouTube video links displayed in grid
- ✅ Auto-sync from YouTube channel (daily)
- ✅ Video search & filtering
- ✅ Mobile responsive design
- ✅ SEO optimized (structured data, sitemaps)
- ✅ HTTPS/SSL secured
- ✅ Performance optimized (caching, compression)

### Features (Phase 2 - Ready to Build)
- 📝 Health articles blog
- 🎯 Online consultation booking
- 💳 Stripe payment integration
- 🤖 AI health coach (Claude API)
- 📊 Analytics dashboard

---

## 🔧 Maintenance Commands

```bash
cd /opt/vaidhyasala/apps/website

# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f web    # Next.js
docker-compose logs -f postgres
docker-compose logs -f redis

# Stop containers (keeps data)
docker-compose down

# Start containers
docker-compose up -d

# Restart services
docker-compose restart

# Check disk usage
docker system df

# Backup database (optional)
docker-compose exec -T postgres pg_dump -U vaidyasala vaidhyasala > backup.sql
```

---

## 📞 Troubleshooting

### Port Conflicts
```bash
# Check if port is in use
lsof -i :3001
lsof -i :5434
lsof -i :6382

# View what containers are using it
docker ps | grep "3001\|5434\|6382"
```

### Database Issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test database connection
docker-compose exec -T postgres pg_isready -U vaidyasala

# Check database size
docker-compose exec -T postgres psql -U vaidyasala -d vaidhyasala \
  -c "SELECT pg_size_pretty(pg_database_size('vaidhyasala'));"
```

### Nginx Issues
```bash
# Test config
sudo nginx -t

# View errors
sudo tail -f /var/log/nginx/error.log

# Reload
sudo systemctl reload nginx
```

### SSL Certificate Issues
```bash
# Check certificate details
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew
```

---

## 📱 Features by Page

### Homepage
- Grid display of 560+ YouTube videos
- Video title, thumbnail, description
- Direct links to YouTube channel
- Search functionality
- Category filtering
- Mobile responsive

### Video Page
- Video details
- Link to YouTube
- Related videos
- Video metadata (duration, upload date)

### Blog (Optional)
- Health articles
- Article categories
- Article search
- Author information

### Consultation Booking (Optional)
- Booking form
- Calendar integration
- Payment processing (Stripe)
- Confirmation emails

---

## 🎓 How to Use deploy.sh

The script is **fully automated** - you don't need to do anything except run it:

```bash
./deploy.sh
```

It will:

1. **Verify** project structure exists
2. **Check** for port conflicts
3. **Check** for volume conflicts
4. **Stop** any existing Vaidyasala containers
5. **Create** .env.local with all secrets
6. **Build** Docker image (3-5 minutes)
7. **Start** all containers
8. **Verify** container health
9. **Run** database migrations
10. **Test** API endpoints
11. **Check** database
12. **Setup** Nginx status
13. **Check** SSL certificate status
14. **Fetch** 560+ YouTube videos
15. **Configure** daily cron job

**Output:** Complete deployment summary with next steps.

---

## 📚 Documentation Files

- **README.md** (this file) - Overview and quickstart
- **QUICK_DEPLOY_INSTRUCTIONS.md** - Simple 3-step guide
- **DEPLOYMENT_CHECKLIST.txt** - Detailed verification steps
- **DEPLOYMENT_SUMMARY.txt** - Quick reference sheet
- **DEPLOYMENT_STEPS.md** - Manual step-by-step guide

---

## 💡 Key Benefits

✅ **100% Automated** - No manual Docker commands  
✅ **Safe** - Won't affect your 18+ existing projects  
✅ **Fast** - 15-20 minutes to live production  
✅ **Reliable** - Health checks at every step  
✅ **Scalable** - Optimized Docker images  
✅ **Secure** - SSL/TLS, environment variables, non-root user  
✅ **SEO Ready** - Structured data, sitemaps, meta tags  
✅ **Mobile First** - Fully responsive design  

---

## 🎯 Next Steps

1. **Copy deploy.sh** to `/opt/vaidhyasala/`
2. **Run** `chmod +x deploy.sh`
3. **Execute** `./deploy.sh`
4. **Copy** nginx.conf to `/etc/nginx/sites-available/`
5. **Setup** SSL with certbot
6. **Visit** https://vaidhyasala.com

---

## ✨ Result

Your Vaidyasala website will be:

- ✅ Live at https://vaidhyasala.com
- ✅ Displaying 560+ YouTube videos
- ✅ Auto-syncing daily at midnight
- ✅ Mobile responsive & SEO optimized
- ✅ Secure with HTTPS/SSL
- ✅ Performance optimized
- ✅ Ready for 18+ other VPS projects

---

**Made with ❤️ by Claude | Fully Automated | Zero Questions | Production Ready**

---

## 📧 Support

If you encounter any issues:

1. Check **DEPLOYMENT_CHECKLIST.txt** for verification steps
2. Review logs: `docker-compose logs`
3. Check **TROUBLESHOOTING** section in this file
4. Verify ports: `lsof -i :3001` (etc.)

---

Last Updated: 2026-09-06  
Deployment Package Version: 1.0  
Status: Production Ready ✅

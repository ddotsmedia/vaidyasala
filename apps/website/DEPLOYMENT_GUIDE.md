# Vaidyasala Website - Production Deployment Guide

## Pre-Deployment Checklist

- [ ] Update environment variables
- [ ] Configure Stripe keys (production)
- [ ] Set up database backup (if using managed DB)
- [ ] Configure domain/DNS
- [ ] Enable SSL/HTTPS
- [ ] Set up monitoring/logging

## Environment Variables for Production

Create `.env.production.local`:

```env
DATABASE_URL=postgresql://user:pass@host:5432/vaidyasala
YOUTUBE_API_KEY=AIzaSyA3SVk-gYWASnuP1ItyjI9UJgJSpSpQSv0
YOUTUBE_CHANNEL_ID=UCADw8vrx5oszMLul5PHzCqA
NEXT_PUBLIC_SITE_URL=https://vaidyasala.com
STRIPE_PUBLIC_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
ADMIN_PASSWORD=StrongPassword123!@#
NODE_ENV=production
```

> **Note**: Switch DATABASE_URL to PostgreSQL for production (currently using SQLite for development)

## Option 1: Vercel Deployment (Recommended)

### 1. Connect Repository
```bash
vercel link
```

### 2. Configure Environment
In Vercel Dashboard:
- Go to Settings → Environment Variables
- Add all production environment variables
- Select production environment

### 3. Deploy
```bash
vercel --prod
```

### 4. Database Setup
For managed PostgreSQL:
- Vercel integrates with Postgres
- Or use external service (Railway, Supabase)
- Update CONNECTION_URL in environment

### 5. Domain Setup
- Add custom domain in Vercel Settings
- Configure DNS records
- SSL auto-configured

## Option 2: VPS/Docker Deployment

### 1. Build Docker Image
```bash
docker build -t vaidyasala-web .
```

### 2. Push to Registry (Optional)
```bash
docker tag vaidyasala-web ghcr.io/yourname/vaidyasala-web:latest
docker push ghcr.io/yourname/vaidyasala-web:latest
```

### 3. Run Container
```bash
docker run -d \
  --name vaidyasala-prod \
  -p 80:3000 \
  -p 443:3000 \
  --env-file .env.production.local \
  -v /data/db:/app/prisma \
  vaidyasala-web
```

### 4. Reverse Proxy (Nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name vaidyasala.com;
    
    ssl_certificate /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. SSL Certificate
```bash
certbot certonly --standalone -d vaidyasala.com
```

## Option 3: Railway.app Deployment

### 1. Connect GitHub
- Log in to Railway
- New Project → GitHub
- Select repository

### 2. Set Environment
- Click "Raw Editor"
- Paste environment variables

### 3. Deploy
- Auto-deploys on git push
- Monitor in Railway dashboard

## Post-Deployment Tasks

### 1. Database Migrations
```bash
pnpm prisma migrate deploy
```

### 2. Seed Database (if empty)
```bash
pnpm prisma db seed
```

### 3. Sync YouTube Videos
```bash
curl -X GET "https://vaidyasala.com/api/videos/sync" \
  -H "X-Admin-Password: [YOUR_ADMIN_PASSWORD]"
```

### 4. Test Endpoints
```bash
# Homepage
curl https://vaidyasala.com

# Video sync
curl -H "X-Admin-Password: [PASSWORD]" https://vaidyasala.com/api/videos/sync

# Blog
curl https://vaidyasala.com/api/articles
```

### 5. Monitor Logs
- **Vercel**: Vercel Dashboard → Logs
- **Docker**: `docker logs vaidyasala-prod`
- **Railway**: Railway Dashboard → Logs

## Scaling Considerations

### Database
- Switch from SQLite to PostgreSQL
- Use managed database service
- Enable backups & replication

### Performance
- Enable Redis caching (optional)
- Configure CDN for static assets
- Use image optimization

### Monitoring
- Set up error tracking (Sentry)
- Enable analytics (Vercel Analytics)
- Monitor API response times

## Security Hardening

1. **API Keys**: Rotate periodically
2. **Admin Password**: Use strong password
3. **HTTPS Only**: Redirect HTTP → HTTPS
4. **Rate Limiting**: Add API rate limits
5. **CORS**: Configure appropriately
6. **Environment**: Never commit .env files

## Troubleshooting

### Database Connection Error
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
pnpm prisma db execute --stdin < query.sql
```

### YouTube Videos Not Syncing
- Verify API key is valid
- Check channel ID
- Ensure API is enabled in Google Cloud Console
- Check admin password in header

### Stripe Payments Failing
- Verify Stripe keys (test vs. live)
- Check webhook configuration
- Review Stripe Dashboard logs

## Maintenance

### Regular Tasks
- [ ] Monitor disk space (especially `/data/db`)
- [ ] Review error logs weekly
- [ ] Update dependencies monthly
- [ ] Backup database weekly
- [ ] Check API quotas (YouTube, Stripe)

### Updates
```bash
pnpm update
pnpm prisma generate
pnpm build
# Redeploy
```

## Rollback Plan

### If Deployment Fails
1. **Vercel**: Revert to previous deployment
2. **Docker**: Keep previous image, switch back
3. **GitHub**: Revert commit and redeploy

## Support & Documentation

- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Stripe: https://stripe.com/docs
- YouTube API: https://developers.google.com/youtube

---

**Last Updated**: 2026-09-06

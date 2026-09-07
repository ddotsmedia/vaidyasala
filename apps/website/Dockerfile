# Vaidyasala Next.js Dockerfile
# Multi-stage build for optimal image size

FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY apps/website ./apps/website

# Build Next.js application
WORKDIR /app/apps/website
RUN pnpm prisma generate
RUN pnpm build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies only
RUN npm install -g pnpm && apk add --no-cache curl
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/apps/website/.next /app/apps/website/.next
COPY --from=builder /app/apps/website/public /app/apps/website/public
COPY --from=builder /app/apps/website/package.json /app/apps/website/
COPY apps/website/prisma ./apps/website/prisma

WORKDIR /app/apps/website

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Fix ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Run Next.js
CMD ["node_modules/.bin/next", "start"]

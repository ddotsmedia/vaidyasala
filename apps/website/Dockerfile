# Vaidyasala Next.js Dockerfile
# Multi-stage build for optimal image size

FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY apps/website ./apps/website
COPY packages ./packages

# Build Next.js application
WORKDIR /app/apps/website
RUN pnpm prisma generate
RUN pnpm build

# Production image
FROM node:22-alpine

WORKDIR /app

# Install runtime dependencies only
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/apps/website/.next /app/apps/website/.next
COPY --from=builder /app/apps/website/public /app/apps/website/public
COPY --from=builder /app/apps/website/package.json /app/apps/website/
COPY --from=builder /app/packages ./packages
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
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run Next.js
CMD ["node_modules/.bin/next", "start"]

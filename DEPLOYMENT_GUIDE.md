# Deployment Guide

This guide covers production deployment for FinOS using Docker Compose, Railway, Vercel, PostgreSQL, and Redis.

## Production Deployment Checklist

- Configure production PostgreSQL
- Configure production Redis
- Set all required environment variables
- Use HTTPS for web and API traffic
- Run Prisma validation and migrations
- Seed demo data only for demo environments
- Configure JWT and token secrets
- Configure CORS for the deployed web URL
- Enable API workers where required
- Verify outbox worker and BullMQ workers are running
- Configure email and WhatsApp provider credentials when used
- Set up database backups and point-in-time recovery
- Set up logs and error monitoring
- Validate login, invoice posting, payment allocation, reversal, collections, banking, dashboard, and AI CFO flows

## Environment Variables

### Shared

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | Yes | `production`, `development`, or `test` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |

### API

| Variable | Required | Description |
| --- | --- | --- |
| `API_PORT` or platform `PORT` | Yes | API port |
| `JWT_ACCESS_SECRET` | Yes | Access token signing secret |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing secret |
| `JWT_ACCESS_TTL` | No | Access token lifetime |
| `JWT_REFRESH_TTL` | No | Refresh token lifetime |
| `WEB_ORIGIN` | Yes | Allowed frontend origin |
| `ENABLE_WORKERS` | Yes | Enables background workers |
| `EMAIL_PROVIDER` | No | Email provider identifier |
| `EMAIL_FROM` | No | Sender email address |
| `WHATSAPP_PROVIDER` | No | WhatsApp provider identifier |
| `LOG_LEVEL` | No | Structured log level |

### Web

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes | Public API URL consumed by the Next.js app |

## Docker Compose Deployment

The repository includes Docker deployment assets for API, web, PostgreSQL, Redis, and workers.

### 1. Configure Environment

Create `.env` from the example:

```bash
cp .env.production.example .env
```

Update secrets before starting production services.

### 2. Build and Start

```bash
docker compose up --build -d
```

### 3. Run Migrations

```bash
docker compose exec api pnpm --filter @finos/database exec prisma migrate deploy
```

### 4. Optional Demo Seed

Run this only in demo environments:

```bash
docker compose exec api pnpm --filter @finos/database prisma:seed
```

### 5. Verify Services

- Web app responds on configured web port
- API health endpoint responds
- PostgreSQL accepts connections
- Redis accepts connections
- Worker logs show queue processing
- Outbox backlog is not growing unexpectedly

## Railway Deployment Guide

Railway is suitable for the API, workers, PostgreSQL, and Redis.

### Recommended Services

- API service from `apps/api`
- Worker service from the same API image with workers enabled
- PostgreSQL plugin or external managed PostgreSQL
- Redis plugin or external managed Redis

### API Configuration

Set:

```env
NODE_ENV=production
DATABASE_URL=<railway-postgres-url>
REDIS_URL=<railway-redis-url>
JWT_ACCESS_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
WEB_ORIGIN=https://<your-vercel-domain>
ENABLE_WORKERS=false
```

### Worker Configuration

Use the same build, but configure:

```env
ENABLE_WORKERS=true
```

Run migrations before routing production traffic.

## Vercel Deployment Guide

Vercel is recommended for the Next.js frontend.

### Project Settings

- Root directory: `apps/web`
- Framework preset: Next.js
- Build command: use the monorepo build command configured for the web app
- Output: Next.js default

### Environment

```env
NEXT_PUBLIC_API_URL=https://<your-api-domain>
```

After deployment, update API `WEB_ORIGIN` to the Vercel production URL.

## PostgreSQL Setup Guide

Use PostgreSQL 15 or later.

### Recommended Production Settings

- Automated daily backups
- Point-in-time recovery
- SSL connections
- Connection pooling
- Storage monitoring
- Slow query logging for production diagnostics

### Migration Flow

```bash
pnpm --filter @finos/database prisma:validate
pnpm --filter @finos/database exec prisma migrate deploy
pnpm --filter @finos/database prisma:generate
```

Do not run destructive schema changes in production without a backup and rollback plan.

## Redis Setup Guide

Redis is used for BullMQ queues and background workers.

### Recommended Production Settings

- Use a managed Redis provider
- Restrict network access
- Enable authentication
- Monitor memory usage
- Monitor failed jobs and retry spikes
- Configure persistence according to queue durability requirements

## Production Validation Commands

Run before release:

```bash
pnpm --filter @finos/database prisma:validate
pnpm --filter @finos/api typecheck
pnpm --filter @finos/api test
pnpm --filter @finos/api build
pnpm --filter @finos/web typecheck
pnpm --filter @finos/web build
```

## Rollback Guidance

- Keep the previous API and web image available
- Avoid irreversible migrations without explicit rollout planning
- If a deployment fails before migration, roll back application image
- If a deployment fails after migration, evaluate forward fix versus database restore
- Monitor failed outbox events and queue retries after rollback

## Demo Environment Notes

Demo seed data includes:

- Textile Trading Business
- Wholesale Distributor
- Electronics Supplier

Use demo data for recruiters, investors, customers, and portfolio reviews. Do not seed demo data into a real customer production tenant.

# FinOS Deployment Guide

## Services

- `web`: Next.js production server
- `api`: NestJS REST API and worker host
- `postgres`: PostgreSQL
- `redis`: BullMQ queues and background jobs

## Local Production Stack

```bash
docker compose up --build
```

Then run migrations and seed data from a trusted operator shell:

```bash
pnpm --filter @finos/database prisma:migrate
pnpm --filter @finos/database seed
```

Demo users:

- `textile.demo@finos.local`
- `wholesale.demo@finos.local`
- `electronics.demo@finos.local`

Password:

- `Demo@12345`

## Environment Variables

Use `.env.production.example` as the deployment checklist. Never reuse the example JWT secrets in production.

## Worker Behavior

Set `ENABLE_WORKERS=true` only on the API/worker process that should process queues. The outbox publisher, scheduled jobs, notification dispatcher, credit refresh, and collection automation all require Redis.

## Demo Readiness Checklist

- Run database migrations.
- Seed demo data.
- Confirm API health at `/v1`.
- Confirm web can reach `NEXT_PUBLIC_API_URL`.
- Login with one of the demo users.
- Open dashboard, credit command center, collections, banking, and AI CFO.

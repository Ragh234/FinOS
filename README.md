# FinOS

FinOS is a multi-tenant Financial Operating System for SMEs that combines ERP, accounting, collections management, credit intelligence, banking reconciliation, and AI-powered financial insights.

FinOS is designed for small and mid-sized businesses that need operational finance software with the rigor of an accounting system, the workflow depth of an ERP, and the visibility of a modern finance command center.

## Problem Statement

SMEs often run finance across disconnected spreadsheets, accounting tools, bank exports, payment notes, and manual follow-ups. This creates delayed collections, weak credit visibility, duplicate work, poor audit trails, and fragile financial controls.

FinOS addresses this by bringing sales, inventory, payments, accounting, collections, banking, credit intelligence, notifications, and executive insights into one tenant-isolated SaaS platform.

## Why FinOS Exists

FinOS exists to help SMEs answer practical finance questions quickly:

- Who owes us money, and what should we collect first?
- Which customers are becoming risky?
- Are inventory and accounting movements consistent?
- Which payments are allocated, reversed, or pending?
- What is the cash position and expected collection outlook?
- Can finance workflows survive retries, duplicate requests, and concurrent users?

## Key Features

- Multi-tenant company workspace model
- Authentication, company setup, and role-based access control
- Customer and product management
- Inventory balances, stock movements, and sale-linked stock updates
- Invoice creation, posting, payment allocation, and reversals
- Double-entry accounting journal generation
- Banking transaction import and reconciliation workflows
- Collections workspace with follow-ups and promise-to-pay tracking
- Credit intelligence profiles, risk scoring, and credit command center data
- Transactional outbox for reliable event publication
- Idempotency keys for retry-safe financial APIs
- Background automation through BullMQ and Redis
- Notification templates and delivery tracking
- Executive dashboard with KPIs, charts, and AI CFO insights
- Demo datasets for textile trading, wholesale distribution, and electronics supply businesses

## Architecture Overview

```mermaid
flowchart LR
  User[User] --> Web[Next.js Frontend]
  Web --> API[NestJS API]
  API --> DB[(PostgreSQL)]
  API --> Redis[(Redis)]
  API --> Outbox[Transactional Outbox]
  Outbox --> Worker[Outbox Worker]
  Worker --> Queue[BullMQ Queues]
  Queue --> Jobs[Background Workers]
  Jobs --> DB
  Jobs --> Notify[Notification Engine]
  Notify --> Email[Email Provider]
  Notify --> WhatsApp[WhatsApp Provider]
```

FinOS uses a modular backend, a typed frontend, tenant-scoped data access, durable financial transactions, retry-safe APIs, and event-driven automation.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, TypeScript, Tailwind, shadcn/ui-style components |
| Frontend state | TanStack Query, Zustand, React Hook Form, Zod |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL, Prisma |
| Queueing | Redis, BullMQ |
| Reliability | Transactional outbox, idempotency keys, audit logs |
| Deployment | Docker Compose, Railway-ready API, Vercel-ready web app |

## Demo Accounts

Seeded demo tenants use:

| Business | Email | Password |
| --- | --- | --- |
| Textile Trading Business | `textile.demo@finos.local` | `Demo@12345` |
| Wholesale Distributor | `wholesale.demo@finos.local` | `Demo@12345` |
| Electronics Supplier | `electronics.demo@finos.local` | `Demo@12345` |

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL
- Redis

### Install Dependencies

```bash
pnpm install
```

### Configure Environment

Create environment files from the production example or local templates:

```bash
cp .env.production.example .env
```

Set at least:

```env
DATABASE_URL=postgresql://finos:finos@localhost:5432/finos?schema=public
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Prepare Database

```bash
pnpm --filter @finos/database prisma:generate
pnpm --filter @finos/database prisma:migrate
pnpm --filter @finos/database prisma:seed
```

### Run Locally

```bash
pnpm --filter @finos/api dev
pnpm --filter @finos/web dev
```

The web app runs on `http://localhost:3000` and the API runs on the configured API port.

## Deployment Instructions

FinOS is deployed with Docker Compose, Railway, Vercel, managed PostgreSQL, and managed Redis.


## Documentation

- [System Architecture](./SYSTEM_ARCHITECTURE.md)
- [Database Design](./DATABASE_DESIGN.md)
- [API Overview](./API_OVERVIEW.md)
- [Business Workflows](./BUSINESS_WORKFLOWS.md)
- [Security and Reliability](./SECURITY_AND_RELIABILITY.md)
- [Contributing](./CONTRIBUTING.md)
- [Interview Guide](./INTERVIEW_GUIDE.md)
- [Project Metrics](./PROJECT_METRICS.md)

## Future Roadmap

FinOS v1.0 is feature complete. Future work should focus on controlled product evolution:

- More accounting reports and export formats
- Deeper bank statement import support
- More notification providers
- More granular role templates
- Advanced forecasting and scenario planning
- Expanded AI CFO explanations with stricter source citations

New modules should be introduced only after confirming product demand and preserving the existing financial integrity model.

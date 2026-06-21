# FinOS Complete Project and Web Development Interview Guide

This guide is written for someone starting with almost no web development knowledge. It moves from basic terms such as JSON, browser, server, React, and database to the advanced architecture and financial reliability patterns used in FinOS.

The guide is based on the repository source code as it exists now. When older documentation disagrees with code, this guide treats the code as the source of truth and calls out the difference.

---

## 1. How to Study This Guide

Do not try to memorize everything at once.

Use this order:

1. Learn the foundations in Parts 1-3.
2. Understand the FinOS product and repository in Parts 4-6.
3. Trace one complete request in Parts 7-10.
4. Learn the advanced reliability and security topics in Parts 11-16.
5. Practice the interview questions and exercises in Parts 17-20.

A good interview answer normally has four parts:

1. Define the concept.
2. Explain why it is needed.
3. Show where this project uses it.
4. Mention one tradeoff or improvement.

Example:

> Idempotency means the same request can be retried without creating the side effect twice. FinOS uses an `Idempotency-Key` for financial operations such as invoice and payment creation. The backend stores the key, endpoint, request hash, and response. This prevents duplicate payments after a retry. A production improvement would be adding expiration and cleanup policies for old keys.

---

# Part 1: Absolute Web Development Basics

## 2. What Is a Computer Program?

A computer program is a set of instructions written in a programming language.

FinOS is mainly written in:

- TypeScript
- TSX, which is TypeScript containing React UI markup
- CSS
- Prisma Schema Language
- JSON and YAML configuration

Source code is written for humans first. Tools then transform or execute it so the computer can run it.

## 3. What Is the Internet?

The internet is a network connecting computers.

The web is one service built on the internet. A browser such as Chrome sends requests to a server. The server returns a response.

In local FinOS development:

- The browser opens the web app at `http://localhost:3000`.
- The web app sends API requests to `http://localhost:4000/v1`.
- The API reads and writes PostgreSQL.
- The API may send background work through Redis and BullMQ.

`localhost` means "this computer."

## 4. Frontend, Backend, and Database

### Frontend

The frontend is what the user sees and interacts with:

- Pages
- Forms
- Buttons
- Tables
- Navigation
- Loading and error states

FinOS frontend: `apps/web`

### Backend

The backend receives requests, checks security, applies business rules, and communicates with storage.

FinOS backend: `apps/api`

### Database

The database permanently stores structured information.

FinOS database:

- PostgreSQL is the database system.
- Prisma is the application data-access tool.
- The schema is in `packages/database/prisma/schema.prisma`.

## 5. What Happens When You Click a Button?

Suppose a user creates a customer:

1. React displays a form.
2. The user enters values.
3. React Hook Form stores the current form state.
4. Zod checks whether the values are valid.
5. TanStack Query runs a mutation.
6. The API client sends JSON in an HTTP `POST` request.
7. NestJS receives the request.
8. Authentication, tenant, and permission guards run.
9. A DTO validates the request again on the server.
10. The controller calls a service.
11. The service checks business rules.
12. Prisma sends SQL operations to PostgreSQL.
13. PostgreSQL stores the customer.
14. NestJS returns JSON.
15. TanStack Query refreshes the customer list.
16. React renders the updated table.

This is the central full-stack request cycle.

---

# Part 2: Data and Programming Fundamentals

## 6. What Is JSON?

JSON means JavaScript Object Notation. It is a text format used to exchange structured data.

```json
{
  "name": "Apex Retailers",
  "email": "accounts@apex.example",
  "creditLimit": 250000,
  "active": true
}
```

JSON supports:

- String: `"Apex Retailers"`
- Number: `250000`
- Boolean: `true`
- Null: `null`
- Array: `["email", "phone"]`
- Object: `{ "city": "Mumbai" }`

JSON does not support comments, functions, or `undefined`.

### JSON in FinOS

The frontend sends request bodies as JSON:

```ts
body: JSON.stringify(values)
```

The API returns JSON responses. Prisma also stores some flexible event and audit payloads in JSON columns.

## 7. Object, Array, Variable, and Function

### Variable

A variable gives a name to a value:

```ts
const amount = 5000;
```

`const` means the variable cannot be assigned a different value later.

### Object

An object groups named values:

```ts
const customer = {
  name: "Apex Retailers",
  creditLimit: 250000
};
```

### Array

An array is an ordered list:

```ts
const invoices = ["INV-001", "INV-002"];
```

### Function

A function is reusable behavior:

```ts
function calculateTotal(quantity: number, price: number) {
  return quantity * price;
}
```

### Async Function

Database and network work takes time. `async` and `await` let code wait for a result:

```ts
async function loadCustomers() {
  const customers = await api.get("/customers");
  return customers;
}
```

## 8. JavaScript and TypeScript

JavaScript runs in browsers and on servers through Node.js.

TypeScript adds static types to JavaScript:

```ts
function add(a: number, b: number): number {
  return a + b;
}
```

Benefits:

- Finds mistakes before runtime
- Improves editor suggestions
- Documents expected data
- Makes refactoring safer

FinOS enables strict TypeScript rules in `packages/tsconfig/base.json`, including:

- `strict`
- `noUncheckedIndexedAccess`
- `noImplicitOverride`
- `forceConsistentCasingInFileNames`

TypeScript disappears after compilation. JavaScript runs at runtime.

## 9. Compile Time and Runtime

Compile-time errors are found while building or type-checking.

Runtime errors happen while the application is running.

Example:

- TypeScript may catch passing a string where a number is required.
- The database may reject a duplicated unique value at runtime.

Both type safety and runtime validation are required because external users can send any HTTP data, even if the frontend is typed.

## 10. What Is a Package?

A package is reusable code distributed through a package registry.

Examples in FinOS:

- `react`
- `next`
- `@nestjs/core`
- `@prisma/client`
- `zod`
- `bullmq`

`package.json` describes a package:

- Name and version
- Commands in `scripts`
- Runtime dependencies
- Development dependencies

`pnpm-lock.yaml` records exact dependency versions so installations are repeatable.

## 11. What Are Node.js and pnpm?

Node.js runs JavaScript outside the browser. The FinOS API, build tools, and development commands use Node.js.

pnpm is a package manager. It installs packages and runs scripts.

Useful commands:

```powershell
pnpm install
pnpm dev
pnpm build
pnpm typecheck
pnpm test
```

`pnpm --filter @finos/api test` runs a command only for the API package.

## 12. Common File Formats

### `.ts`

TypeScript source.

### `.tsx`

TypeScript with JSX, normally used for React components.

### `.json`

Strict structured data or configuration.

### `.md`

Markdown documentation.

### `.css`

Styles.

### `.yaml` or `.yml`

Human-readable configuration, used here by Docker Compose.

### `.env`

Environment variables. These hold values that change between machines or environments.

### `tsconfig.json`

TypeScript compiler configuration.

### `Dockerfile`

Instructions for building a container image.

### `.prisma`

Prisma database schema.

---

# Part 3: HTTP and APIs

## 13. What Is HTTP?

HTTP is the protocol used for communication between browser and server.

An HTTP request contains:

- Method
- URL
- Headers
- Optional body

An HTTP response contains:

- Status code
- Headers
- Optional body

## 14. HTTP Methods

- `GET`: read data
- `POST`: create data or perform an action
- `PATCH`: partially update data
- `PUT`: replace data
- `DELETE`: remove or archive data

FinOS examples:

```text
GET    /v1/customers
POST   /v1/customers
PATCH  /v1/customers/:id
DELETE /v1/customers/:id
POST   /v1/sales/invoices/:id/post
POST   /v1/payments/:id/reverse
```

Action endpoints such as `post` and `reverse` use `POST` because they change state.

## 15. URL, Route, Path Parameter, and Query Parameter

URL:

```text
http://localhost:4000/v1/customers/abc
```

- Protocol: `http`
- Host: `localhost`
- Port: `4000`
- API version: `v1`
- Resource: `customers`
- Path parameter: `abc`

A query parameter looks like:

```text
/v1/customers?search=apex&page=2
```

Path parameters identify a resource. Query parameters usually filter, sort, or paginate.

## 16. Headers

Headers carry metadata.

Important FinOS headers:

```http
Authorization: Bearer <access-token>
x-company-id: <company-id>
Idempotency-Key: <unique-key>
Content-Type: application/json
```

- `Authorization` proves identity.
- `x-company-id` selects the active tenant.
- `Idempotency-Key` makes a retry safe.
- `Content-Type` says the body is JSON.

## 17. Common HTTP Status Codes

- `200 OK`: successful read or action
- `201 Created`: resource created
- `204 No Content`: success with no response body
- `400 Bad Request`: invalid data or business rule
- `401 Unauthorized`: missing or invalid login credentials
- `403 Forbidden`: logged in but not allowed
- `404 Not Found`: resource does not exist
- `409 Conflict`: request conflicts with current state
- `429 Too Many Requests`: rate limit reached
- `500 Internal Server Error`: unexpected server failure

Important distinction:

- `401`: "Who are you?" failed.
- `403`: "You are known, but may not do this."

## 18. REST API

REST is a common style for HTTP APIs based on resources.

Good REST design:

- Uses nouns such as `/customers`
- Uses HTTP methods consistently
- Is stateless between requests
- Returns predictable response and error shapes

FinOS is REST-like but also has business action endpoints. This is reasonable because finance operations such as posting or reversal are commands, not simple CRUD updates.

## 19. API Versioning

The API enables URI versioning:

```ts
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: "1"
});
```

Therefore controllers become available under `/v1/...`.

Versioning allows future incompatible API changes without immediately breaking old clients.

## 20. CORS

CORS means Cross-Origin Resource Sharing.

The browser considers these different origins:

- `http://localhost:3000`
- `http://localhost:4000`

The API explicitly allows the web origin. Without CORS configuration, the browser may block frontend requests even when the API itself is running.

## 21. Stateless Requests

An API request should contain the information needed to process it, such as the token and company context.

The server does not rely on one permanent browser connection. This makes scaling and recovery easier.

---

# Part 4: What FinOS Is

## 22. Product Summary

FinOS is a multi-tenant financial operating system for small and medium businesses.

It combines:

- Customer management
- Product and inventory management
- Sales invoices
- Payments and allocations
- Double-entry accounting
- Banking and reconciliation
- Collections follow-ups
- Promises to pay
- Credit intelligence
- Notifications
- AI CFO-style financial summaries
- Background automation

The goal is to replace disconnected spreadsheets and manual financial workflows with one auditable system.

## 23. Important Business Terms

### SME

Small or medium enterprise.

### ERP

Enterprise Resource Planning. Software that joins business functions such as sales, inventory, finance, and operations.

### Accounts Receivable

Money customers owe the company.

### Accounts Payable

Money the company owes suppliers.

### Invoice

A document requesting payment for goods or services.

### Payment Allocation

Connecting a payment amount to one or more invoices.

### Ledger

The accounting record of transactions by account.

### Journal Entry

A balanced accounting transaction containing debit and credit lines.

### Reconciliation

Matching internal financial records to external bank records.

### Promise to Pay

A customer's commitment to pay a certain amount by a certain date.

### Credit Risk

The risk that a customer will not pay fully or on time.

## 24. Multi-Tenant SaaS

SaaS means Software as a Service. Many companies use the same deployed application.

Multi-tenancy means each company is a separate tenant inside the shared system.

FinOS uses `Company` as the tenant boundary. Most business records contain `companyId`.

Benefits:

- One application can serve many companies.
- Infrastructure is shared.
- Upgrades can be deployed centrally.

Risk:

- A missing `companyId` condition could expose one company's data to another.

That is why tenant isolation must be applied in guards, services, queries, jobs, events, and database constraints.

---

# Part 5: Repository and Monorepo

## 25. Top-Level Structure

```text
FinOS/
|-- apps/
|   |-- api/              NestJS backend
|   `-- web/              Next.js frontend
|-- packages/
|   |-- database/         Prisma schema, client export, seed
|   `-- tsconfig/         Shared TypeScript configurations
|-- docs/                 Additional documentation
|-- package.json          Root scripts and tools
|-- pnpm-workspace.yaml   Workspace package locations
|-- turbo.json            Task orchestration
|-- docker-compose.yml    Local infrastructure
`-- *.md                  Architecture and project documents
```

## 26. What Is a Monorepo?

A monorepo stores multiple related applications and packages in one repository.

FinOS packages:

- `@finos/web`
- `@finos/api`
- `@finos/database`
- `@finos/tsconfig`

Benefits:

- One dependency installation
- Shared configuration
- Easier coordinated changes
- Consistent commands
- Local packages can depend on each other using `workspace:*`

Tradeoffs:

- Build configuration is more complex.
- A large monorepo can become slow without caching and boundaries.

## 27. pnpm Workspace

`pnpm-workspace.yaml` tells pnpm where workspace packages live:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

The API depends on the local database package:

```json
"@finos/database": "workspace:*"
```

This means use the package from this workspace instead of downloading it from a registry.

## 28. Turborepo

Turborepo coordinates tasks across workspace packages.

The root command:

```powershell
pnpm build
```

runs:

```text
turbo build
```

The `turbo.json` file defines:

- Task dependencies
- Cache behavior
- Build output folders
- Persistent development tasks

`dependsOn: ["^build"]` means build dependencies before building the current package.

## 29. Shared TypeScript Configuration

The repository avoids repeating all compiler options.

- `packages/tsconfig/base.json`: common strict settings
- `packages/tsconfig/next.json`: React and Next.js settings
- `packages/tsconfig/nest.json`: NestJS decorators and CommonJS output

`apps/web/tsconfig.json` extends the Next.js configuration.

The alias:

```json
"@/*": ["./src/*"]
```

allows:

```ts
import { Button } from "@/components/ui/button";
```

instead of long relative paths such as:

```ts
import { Button } from "../../../components/ui/button";
```

## 30. Why `apps/web/tsconfig.json` Has These Options

- `allowJs`: JavaScript files are allowed if needed.
- `noEmit`: TypeScript checks types but Next.js handles output.
- `isolatedModules`: every file must be safely compiled independently.
- `plugins: [{ "name": "next" }]`: enables Next.js-aware TypeScript behavior.
- `include`: files that TypeScript should inspect.
- `exclude: ["node_modules"]`: skip installed dependency source.

---

# Part 6: High-Level Architecture

## 31. System Diagram

```text
User
  |
  v
Next.js + React web app
  |
  | HTTP + JSON + JWT + company header
  v
NestJS API
  |
  | Prisma queries and transactions
  v
PostgreSQL

NestJS API
  |
  | outbox publication
  v
Redis + BullMQ
  |
  v
Background workers
  |
  v
Credit, collections, notifications, derived updates
```

## 32. Source of Truth

PostgreSQL is the main system of record.

Redis is not the authoritative financial database. It supports queues and temporary job processing.

This distinction matters:

- PostgreSQL must preserve financial correctness.
- Redis can help process work asynchronously.
- If a queue message is temporarily unavailable, the transactional outbox keeps the event in PostgreSQL for retry.

## 33. Layer Responsibilities

### Frontend

- Display data
- Collect input
- Provide client-side validation
- Send requests
- Cache server responses

### Controller

- Define HTTP route
- Read path, query, body, headers, and current context
- Call the appropriate service

### Guard

- Decide whether a request may continue

### DTO

- Validate and transform external input

### Service

- Apply business rules
- Coordinate repositories and other services
- Open transactions
- Create audit records and events

### Repository

- Encapsulate repeated data-access queries

### Prisma

- Provide typed database operations

### PostgreSQL

- Persist data
- Enforce constraints
- Execute transactions

### Worker

- Perform asynchronous or scheduled tasks

---

# Part 7: Frontend - React and Next.js

## 34. What Is React?

React is a library for building user interfaces from components.

A component is a function that returns UI:

```tsx
function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>;
}
```

Important React ideas:

- Component
- Props
- State
- Event handling
- Conditional rendering
- Lists
- Hooks
- Re-rendering

## 35. JSX and TSX

JSX looks similar to HTML but is written inside JavaScript or TypeScript:

```tsx
<Button disabled={mutation.isPending}>
  {mutation.isPending ? "Saving" : "Save"}
</Button>
```

Differences from HTML include:

- JavaScript expressions use `{}`.
- CSS class uses `className`.
- Events use camelCase such as `onClick`.
- Components begin with capital letters.

TSX is JSX with TypeScript.

## 36. Props and State

Props are values passed into a component.

State is data owned by a component that can change.

FinOS example:

```tsx
const [showForm, setShowForm] = useState(false);
```

When `setShowForm` runs, React renders the component again with the new value.

## 37. Hooks

Hooks are functions that connect a component to React features.

FinOS uses:

- `useState`: local state
- `useMemo`: cache a calculated value
- `useQuery`: load server data
- `useMutation`: change server data
- `useQueryClient`: work with the query cache
- `useForm`: manage form state
- Zustand store hooks: shared client state

Hooks must be called consistently at the top level of React components.

## 38. What Is Next.js?

Next.js is a framework built on React.

It provides:

- Routing
- Layouts
- Server and client components
- Build optimization
- Production server
- Metadata support

FinOS uses the App Router in `apps/web/src/app`.

## 39. File-Based Routing

Folders and `page.tsx` files define routes:

```text
src/app/auth/login/page.tsx       -> /auth/login
src/app/(app)/customers/page.tsx  -> /customers
src/app/(app)/payments/page.tsx   -> /payments
```

The `(app)` folder is a route group. Parentheses organize routes without adding `(app)` to the URL.

`layout.tsx` wraps child routes with shared UI.

## 40. Server and Client Components

Next.js components are server components by default.

Files containing:

```ts
"use client";
```

are client components. They can use browser-only features and interactive hooks.

FinOS interactive pages use client components because they need:

- Form state
- Browser storage
- Click handlers
- TanStack Query
- Zustand

Tradeoff:

- Client components send more JavaScript to the browser.
- Server components can reduce browser JavaScript and fetch securely on the server.

## 41. TanStack Query

TanStack Query manages server state.

Server state is data owned by the backend, such as customers or invoices.

Example:

```tsx
const query = useQuery({
  queryKey: ["customers"],
  queryFn: () => api.get("/customers")
});
```

It provides:

- Loading state
- Error state
- Caching
- Refetching
- Request deduplication
- Cache invalidation

After a mutation:

```tsx
queryClient.invalidateQueries({ queryKey: ["customers"] });
```

This marks customer data stale and allows it to be fetched again.

## 42. Mutation

A mutation changes server data:

```tsx
const mutation = useMutation({
  mutationFn: (values) => api.post("/customers", values),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  }
});
```

Queries read. Mutations create, update, delete, post, allocate, or reverse.

## 43. Zustand

Zustand manages shared client-side state.

FinOS has:

- `session-store.ts`: access token, refresh token, active company ID
- `workspace-store.ts`: navigation collapse and search state

The `persist` middleware stores this state in browser storage so it survives page refresh.

Important security discussion:

- The current implementation stores access and refresh tokens in persisted browser state, normally `localStorage`.
- This is simple but tokens may be exposed if an XSS vulnerability executes JavaScript.
- A stronger production design often stores refresh tokens in secure, `HttpOnly`, `SameSite` cookies and keeps short-lived access tokens in memory.

Do not claim the current frontend already uses `HttpOnly` cookies. It does not.

## 44. React Hook Form

React Hook Form manages:

- Input registration
- Form values
- Validation errors
- Submission
- Reset behavior
- Pending UI integration

Example:

```tsx
const form = useForm<LoginValues>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: "", password: "" }
});
```

## 45. Zod

Zod defines runtime schemas in the frontend.

Why runtime validation is needed:

- TypeScript types do not exist at runtime.
- User input starts as untrusted text.
- Number inputs may need conversion.

Zod validates before the request is sent, improving user experience.

The backend must still validate independently because attackers can bypass the frontend.

## 46. Tailwind CSS

Tailwind provides small utility classes:

```tsx
<main className="flex min-h-screen items-center justify-center p-6">
```

- `flex`: flexbox layout
- `min-h-screen`: minimum full viewport height
- `items-center`: center on cross axis
- `justify-center`: center on main axis
- `p-6`: padding

The Tailwind configuration connects semantic colors such as `primary`, `muted`, and `destructive` to CSS variables.

## 47. Reusable Components

FinOS organizes reusable UI into:

- `components/ui`: basic primitives such as buttons and inputs
- `components/forms`: form helpers
- `components/data`: tables, charts, and states
- `components/app`: shell, navigation, and page headers
- `features/module-pages.tsx`: reusable business page patterns

`CrudModulePage` is a generic component that supports list, search, create form, validation, mutation, and table refresh.

Benefit:

- Less repeated code.

Tradeoff:

- It uses `Record<string, any>` and several `as any` casts, reducing type safety.
- As feature behavior becomes more specialized, one generic CRUD component can become difficult to maintain.

This is a useful interview observation: abstraction removes repetition but can hide domain differences.

## 48. Frontend API Client

The client in `apps/web/src/lib/api/client.ts`:

1. Reads token and company ID from Zustand.
2. Sets JSON content type.
3. Adds bearer token.
4. Adds `x-company-id`.
5. Adds an optional idempotency key.
6. Calls `${API_BASE}/v1${path}`.
7. Converts failed responses into JavaScript errors.
8. Parses successful JSON.

Default API base:

```text
http://localhost:4000
```

The environment variable `NEXT_PUBLIC_API_URL` can override it.

`NEXT_PUBLIC_` means the value may be included in browser code. Never place secrets in a `NEXT_PUBLIC_` variable.

---

# Part 8: Backend - NestJS

## 49. What Is NestJS?

NestJS is a Node.js backend framework that gives applications a structured architecture.

Core NestJS concepts:

- Module
- Controller
- Provider or service
- Dependency injection
- Decorator
- Guard
- Pipe
- Exception

## 50. Module

A module groups related functionality.

FinOS modules include:

- Auth
- Companies
- Customers
- Products
- Inventory
- Accounting
- Sales
- Payments
- Banking
- Collections
- Credit Intelligence
- Notifications
- Automation
- AI CFO

`AppModule` imports them and registers global guards.

## 51. Controller

A controller maps HTTP routes to code:

```ts
@Controller({ path: "payments", version: "1" })
export class PaymentsController {
  @Get()
  @Permissions("payment.read")
  list() {
    // ...
  }
}
```

Decorators provide metadata:

- `@Controller`
- `@Get`
- `@Post`
- `@Patch`
- `@Delete`
- `@Permissions`
- `@Public`

## 52. Service

A service contains business logic.

For example, `PaymentsService.create`:

- Verifies the party belongs to the company.
- Checks payment direction against customer or supplier type.
- Calculates or accepts allocations.
- Prevents allocation above payment amount.
- Creates the payment in a transaction.
- Updates invoice balances.
- Posts the journal entry.
- Records audit information.
- Writes domain events.

This logic belongs in a service rather than the controller because it should be reusable and testable without HTTP.

## 53. Dependency Injection

Dependency injection means a class receives dependencies instead of constructing them itself.

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly ledger: LedgerPostingService
) {}
```

Benefits:

- Easier testing
- Clear dependencies
- Replaceable implementations
- Central lifecycle management

## 54. DTO

DTO means Data Transfer Object.

A DTO defines expected request data and validation rules.

The global `ValidationPipe` uses:

- `whitelist: true`: remove properties not defined by the DTO
- `forbidNonWhitelisted: true`: reject unexpected properties
- `transform: true`: transform values based on DTO types

Rejecting extra input reduces accidental or malicious mass assignment.

## 55. Guards

Guards run before controller logic.

FinOS global guard order:

1. Throttler guard
2. JWT authentication guard
3. Tenant guard
4. Permissions guard

### Throttler Guard

Limits requests to 120 per 60 seconds under the configured default.

### JWT Guard

- Skips routes marked `@Public()`.
- Reads `Authorization: Bearer ...`.
- Verifies the access token.
- Places token data on `request.user`.

### Tenant Guard

- Reads `x-company-id`.
- Confirms the user has an active company membership.
- Combines role permissions and membership-specific permissions.
- Places tenant context on `request.tenant`.

### Permissions Guard

- Reads permissions required by `@Permissions`.
- Requires company context for protected tenant operations.
- Rejects missing permissions.

## 56. Decorators

A decorator attaches metadata or modifies class behavior.

NestJS relies heavily on TypeScript decorators:

```ts
@Injectable()
@Controller()
@Post()
```

The backend TypeScript configuration enables:

- `experimentalDecorators`
- `emitDecoratorMetadata`

## 57. API Bootstrap

`apps/api/src/main.ts` starts the API:

1. Creates the Nest application.
2. Loads configuration.
3. Adds Helmet security headers.
4. Enables CORS.
5. Enables `/v1` URI versioning.
6. Adds global request validation.
7. Listens on `API_PORT`, defaulting to `4000`.

Important documentation correction:

- Some older project text says port `3001`.
- Current source code, web client, environment example, and Docker Compose use `4000`.

## 58. Helmet

Helmet adds HTTP response headers that reduce common browser security risks.

It helps with defense in depth, but it does not replace:

- Input validation
- Authentication
- Authorization
- Secure token storage
- Safe database queries
- Content Security Policy tuning

## 59. Exceptions

Services throw NestJS exceptions:

- `BadRequestException`
- `UnauthorizedException`
- `ForbiddenException`
- `NotFoundException`
- `ConflictException`

NestJS converts them into HTTP error responses.

---

# Part 9: Database, PostgreSQL, and Prisma

## 60. Relational Database Basics

A relational database stores data in tables.

Terms:

- Table: collection of related records
- Row: one record
- Column: one property
- Primary key: unique row identifier
- Foreign key: reference to another row
- Index: structure that speeds lookups
- Constraint: rule enforced by the database

## 61. SQL

SQL means Structured Query Language.

Conceptual query:

```sql
SELECT *
FROM "Invoice"
WHERE "companyId" = 'company-1'
  AND "amountDue" > 0;
```

FinOS usually generates SQL through Prisma rather than writing raw SQL.

## 62. What Is Prisma?

Prisma is an ORM and database toolkit.

ORM means Object-Relational Mapping. It maps database records to programming-language objects.

Prisma provides:

- Schema definition
- Generated TypeScript client
- Type-safe queries
- Relations
- Migrations
- Transactions
- Prisma Studio

Example:

```ts
const invoices = await prisma.invoice.findMany({
  where: {
    companyId,
    amountDue: { gt: 0 }
  }
});
```

## 63. Prisma Schema

The schema defines models and enums.

Examples of model groups:

- Identity: `User`, `RefreshToken`, verification and reset tokens
- Tenancy: `Company`, `CompanyMembership`
- Master data: `Party`, `Product`, `Unit`, `TaxRate`
- Inventory: `StockBalance`, `StockMovement`
- Sales: `Invoice`, `InvoiceLine`
- Payments: `Payment`, `PaymentAllocation`
- Banking: accounts, transactions, statement imports, reconciliations
- Accounting: `Account`, `JournalEntry`, `JournalLine`
- Collections: follow-ups and promises
- Credit: profiles, snapshots, recommendations, forecasts
- Reliability: `OutboxEvent`, `IdempotencyKey`, `AuditLog`
- AI: conversations and messages

## 64. Relations

A company has many invoices. An invoice belongs to one company.

An invoice has many lines. A line belongs to one invoice.

A payment has many allocations. Each allocation connects a payment to an invoice.

This creates a many-to-many business relationship between payments and invoices through `PaymentAllocation`.

## 65. Unique Constraints

Examples:

- Company and SKU must be unique together.
- Company and invoice type and number must be unique together.
- Company and account code must be unique together.
- Company, endpoint, and idempotency key must be unique together.
- Company, payment, and invoice allocation must be unique together.

Composite uniqueness allows different tenants to use the same SKU or document number while preventing duplicates inside one tenant.

## 66. Indexes

Indexes speed frequent searches and sorting.

Examples:

- Outbox status plus creation time
- Invoice company plus due date
- Payment company plus payment date
- Follow-up company plus status plus due date
- Audit request ID

Tradeoff:

- Indexes improve reads.
- They consume storage and make writes slightly more expensive.

## 67. Migration

A migration is a controlled database schema change.

Typical commands:

```powershell
pnpm --filter @finos/database prisma:generate
pnpm --filter @finos/database prisma:migrate
pnpm --filter @finos/database prisma:validate
```

`generate` creates the typed Prisma client.

`migrate` applies schema changes.

`validate` checks the schema.

## 68. Seed Data

Seeding inserts known development or demo records.

FinOS seed logic is in:

```text
packages/database/prisma/seed.ts
```

Seed data helps:

- Demonstrations
- Local development
- Reproducible testing
- Interview walkthroughs

Do not use public demo passwords as production credentials.

## 69. Transaction

A database transaction groups operations into one unit.

ACID:

- Atomicity: all operations succeed or all roll back.
- Consistency: rules remain valid.
- Isolation: concurrent work does not corrupt state.
- Durability: committed data survives failure.

FinOS uses transactions for financial operations because creating only half a payment or half a journal entry would be unacceptable.

## 70. Decimal and Money

Financial values must not rely carelessly on binary floating-point math.

The database schema uses decimal-compatible monetary fields, but service code often converts Prisma decimal values to JavaScript `number`.

Interview-ready observation:

- Database decimals improve stored precision.
- JavaScript number calculations can still introduce rounding behavior.
- Production financial systems often centralize money calculations using integer minor units or a decimal library and define explicit rounding rules.

---

# Part 10: Exact FinOS Business Flows

## 71. Login Flow

Frontend:

1. User enters email and password.
2. Zod validates the form.
3. React Hook Form submits.
4. TanStack mutation calls `/v1/auth/login`.

Backend:

1. Route is public.
2. Email is normalized.
3. User is loaded by email.
4. Argon2 verifies the password hash.
5. User status must be `ACTIVE`.
6. A 15-minute JWT access token is signed.
7. A random refresh token is generated.
8. Only the SHA-256 hash of the refresh token is stored.
9. Tokens are returned.

Frontend:

1. Tokens are saved in the persisted Zustand store.
2. User is redirected to company setup.

Current limitation:

- The client stores a refresh token but does not currently implement automatic refresh and retry in the API client.

## 72. Company and Tenant Flow

After selecting or creating a company:

1. The frontend stores `companyId`.
2. Every API request adds `x-company-id`.
3. `TenantGuard` checks active membership.
4. The guard builds tenant context with role permissions.
5. The service receives `companyId` and scopes database work.

Never trust a company ID merely because the client sent it. Membership must be checked server-side, as FinOS does in the tenant guard.

## 73. Customer Creation Flow

1. User opens `/customers`.
2. `useQuery` loads customer data.
3. User opens the create form.
4. React Hook Form tracks inputs.
5. Zod validates.
6. `POST /v1/customers` is sent.
7. JWT, tenant, and `customer.create` permission are checked.
8. Backend DTO validates.
9. Customer service creates a tenant-scoped `Party` of type customer.
10. Response returns.
11. Query cache is invalidated.
12. Customer list reloads.

## 74. Invoice Creation Flow

Invoice creation and invoice posting are separate.

### Create Draft

1. Verify the customer belongs to the current company.
2. Verify referenced products belong to the company.
3. Calculate subtotal, discount, tax, and total.
4. Begin a transaction.
5. Generate a concurrency-safe document number.
6. Create a draft invoice and its lines.
7. Record an audit log.
8. Write an `InvoiceCreated` outbox event.
9. Commit.

### Post Invoice

1. Load the invoice in the current company.
2. Require `DRAFT` status.
3. Begin a transaction.
4. Post a balanced accounting journal.
5. Optionally create stock issue movements.
6. Update invoice status to `SENT`.
7. Record an audit log.
8. Write an `InvoicePosted` outbox event.
9. Commit.

Why separate create and post?

- A draft can be edited or reviewed.
- Posting makes the financial effect official.
- Accounting systems often distinguish operational preparation from ledger recognition.

## 75. Sales Invoice Accounting

For a sales invoice:

```text
Debit  Accounts Receivable       total
Credit Sales Revenue             total minus tax
Credit Tax Payable               tax
```

Example:

```text
Invoice total: 118
Revenue:       100
Tax:            18

Debit  Accounts Receivable  118
Credit Sales Revenue             100
Credit Tax Payable                18
```

Total debit equals total credit.

The ledger service rejects an unbalanced entry.

## 76. Payment Creation Flow

1. Verify the party belongs to the current company.
2. Incoming payments must belong to customers.
3. Outgoing payments must belong to suppliers.
4. Use supplied allocations or auto-allocate oldest due invoices.
5. Merge duplicate allocations for the same invoice.
6. Ensure allocated total is not greater than payment amount.
7. Begin a transaction.
8. Create payment and allocation rows.
9. For each allocation, conditionally reduce invoice `amountDue`.
10. Update invoice status to partial or paid.
11. Post a balanced journal.
12. Record audit data.
13. Write `PaymentCreated` and `PaymentAllocated` events.
14. Commit.

Incoming customer payment:

```text
Debit  Cash/Bank
Credit Accounts Receivable
```

## 77. Conditional Update for Concurrency

FinOS updates an invoice only when:

- It belongs to the company.
- It is not void.
- Its current amount due is at least the allocation.

The update checks that exactly one row changed.

Why?

Two requests may try to allocate the same open amount at the same time. Reading first and updating later without a condition can over-allocate. A conditional database update makes the state check part of the write.

## 78. Auto-Allocation

When allocations are not supplied, incoming payments are assigned to open invoices ordered by:

1. Earliest due date
2. Earliest issue date

This is similar to FIFO collection behavior.

The algorithm repeatedly uses:

```text
allocation = minimum(invoice amount due, payment amount remaining)
```

until no payment amount remains.

## 79. Reversal Instead of Deletion

Financial history should normally not be destroyed.

Invoice reversal:

- Rejects an already void invoice.
- Requires payment reversal first if money is allocated.
- Creates reversing journal entries.
- Creates compensating stock movements.
- Marks the invoice void.
- Records audit and event data.

Payment reversal:

- Atomically claims the posted payment by changing it to void.
- Restores invoice balances.
- Removes promise allocations and recalculates promise status.
- Creates reversing journal entries.
- Preserves the original payment record.

This creates an audit trail: original event plus explicit correction.

## 80. Inventory Flow

Inventory uses:

- Location
- Stock balance
- Stock movement

A balance answers: "How much is currently available?"

A movement answers: "Why and when did it change?"

Sales posting can create a negative quantity movement such as `SALES_ISSUE`.

The service protects against negative stock with transaction and conditional update patterns.

## 81. Collections Flow

Collections helps recover customer receivables.

It includes:

- Follow-ups
- Due dates
- Priority
- Expected collection amount
- Promise-to-pay records
- Promise allocations
- Fulfillment detection
- Breach detection
- Customer reliability metrics

Payments can satisfy promises. Payment reversals can reopen previously fulfilled promises.

This demonstrates why domain modules are connected: payments affect collections, credit risk, accounting, invoices, and cash.

## 82. Credit Intelligence

Credit intelligence uses operational data to build customer risk information:

- Outstanding exposure
- Overdue exposure
- Payment behavior
- Promise reliability
- Credit utilization
- Risk level
- Recommendations

It is not an isolated AI feature. It is derived from trusted financial records.

## 83. Banking and Reconciliation

Banking includes:

- Bank accounts
- Bank transactions
- Statement imports
- Statement lines
- Reconciliation periods
- Reconciliation matches

Reconciliation verifies that internal records correspond to bank evidence.

This reduces:

- Missing payments
- Duplicate entries
- Unexplained cash differences
- Incorrect cash reporting

## 84. AI CFO

The AI CFO module exposes:

```text
POST /v1/ai-cfo/ask
GET  /v1/ai-cfo/history
```

Its best architectural role is to explain and summarize trusted application data, not invent financial facts.

Interview principle:

> In a finance product, AI output should be grounded in deterministic database calculations, permission-scoped, auditable where necessary, and clearly separated from the accounting system of record.

---

# Part 11: Authentication and Security

## 85. Authentication vs Authorization

Authentication asks:

> Who is the user?

Authorization asks:

> What may this user do?

FinOS authentication uses passwords, access tokens, and refresh tokens.

FinOS authorization uses:

- Company membership
- Roles
- Permission strings
- Route decorators
- Guards

## 86. Password Hashing

Passwords are hashed with Argon2.

Hashing is one-way. The application does not decrypt a stored password. During login it hashes/verifies the provided password against the stored hash.

Never:

- Store plain passwords
- Log passwords
- Email passwords
- Put passwords in JWTs

## 87. JWT

JWT means JSON Web Token.

The access token identifies the user and expires after 15 minutes.

The API verifies:

- Signature
- Expiration
- Secret

JWT contents can be decoded by the holder. Do not put secrets inside JWT payloads.

## 88. Refresh Token Rotation

FinOS creates a random refresh token and stores only its hash.

During refresh:

1. Hash the presented token.
2. Find the stored token.
3. Reject expired or revoked tokens.
4. Atomically mark it revoked.
5. Issue a new token pair.

This makes each refresh token single-use and reduces replay risk.

## 89. Verification and Reset Tokens

Email verification and password reset tokens:

- Are randomly generated
- Are stored as hashes
- Expire
- Have a used timestamp

Password reset also revokes active refresh tokens, which logs out existing sessions after a credential change.

## 90. RBAC

RBAC means Role-Based Access Control.

Roles provide default permissions. Memberships may add explicit permissions.

Examples:

- `customer.read`
- `customer.create`
- `sales.post`
- `payment.create`
- `banking.reconcile`
- `accounting.report.read`

Permissions are more flexible than checking only role names in every controller.

## 91. Tenant Isolation

Tenant isolation exists at multiple levels:

- The client sends active company context.
- The tenant guard verifies membership.
- Services receive company ID.
- Prisma queries filter by company ID.
- Unique constraints often include company ID.
- Events and jobs include company ID.

Defense in depth is important because one missed layer should not immediately expose all tenants.

Possible advanced improvement:

- Add automated tenant-leak tests.
- Consider PostgreSQL Row-Level Security for an additional database layer, while understanding its operational complexity.

## 92. Rate Limiting

The API uses NestJS throttling.

Rate limiting helps reduce:

- Brute-force login attempts
- Accidental request storms
- Basic denial-of-service pressure

Production systems often use different limits for login, reads, writes, and internal jobs.

## 93. Input Validation

Frontend validation is for user experience.

Backend validation is for security and correctness.

Database constraints are the final integrity layer.

Strong systems validate at all three levels.

## 94. Secrets and Environment Variables

Examples:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Secrets should:

- Not be committed
- Be different in production
- Be rotated
- Be stored in a secret manager
- Be provided only to services that require them

`NEXT_PUBLIC_API_URL` is not a secret because browser users can see it.

---

# Part 12: Reliability Patterns

## 95. Idempotency

An operation is idempotent when repeating it produces no additional side effect.

Why finance needs it:

- User double-clicks
- Browser retries
- Network times out after the server commits
- Mobile connection reconnects

FinOS idempotency record contains:

- Company ID
- Key
- Endpoint
- Request hash
- Response payload

Behavior:

- No key: run normally.
- New key: reserve it, run operation, save response.
- Same key and same payload: return original response.
- Same key and different payload: return conflict.
- Same request already running: return conflict.
- Failed handler: delete reservation so a retry can run.

The payload is serialized with sorted object keys before hashing, preventing harmless object key order from changing the request hash.

## 96. Important Idempotency Caveat

The idempotency record is created outside the financial handler's internal transaction.

That design still protects duplicates, but production design must carefully consider:

- A process crash after the business commit but before response storage
- Cleanup of permanently in-progress records
- Transaction boundaries across the idempotency record and business operation

This is a strong advanced interview discussion point. Do not say any pattern is magically perfect; explain its failure windows.

## 97. Transactional Outbox

Problem:

The service needs to update PostgreSQL and publish a queue message. These are two different systems and cannot share a normal database transaction.

Unsafe flow:

1. Commit invoice.
2. Crash before sending event.
3. Invoice exists but automation never runs.

Outbox solution:

1. Begin PostgreSQL transaction.
2. Write invoice.
3. Write outbox event.
4. Commit both.
5. A separate publisher reads pending events.
6. It publishes them to BullMQ.
7. It marks them processed.

The business record and intent to publish are atomic.

## 98. Outbox State Machine

Statuses:

- `PENDING`
- `PROCESSING`
- `PROCESSED`
- `FAILED`

The publisher:

- Polls every 10 seconds.
- Reads up to 50 pending or failed records.
- Claims each event with a conditional update.
- Publishes with a deterministic job ID.
- Marks success or increments retry count on failure.
- Stops retrying after the configured limit in its query.

Conditional claiming prevents two publisher executions from processing the same event simultaneously.

## 99. At-Least-Once Delivery

Queue and outbox systems are normally designed for at-least-once processing.

That means a message may be delivered more than once.

Therefore consumers must be idempotent.

You should not promise "exactly once" casually. Across databases and queues, exactly-once effects are difficult and usually achieved through idempotent processing and deduplication rather than one magical delivery guarantee.

## 100. BullMQ and Redis

BullMQ is a Node.js queue library backed by Redis.

FinOS queues include domain events, credit, collections, and notifications.

Default job behavior:

- 3 attempts
- Exponential backoff starting at 5 seconds
- Remove older completed and failed jobs after limits
- Worker concurrency of 5

Workers start only when:

```env
ENABLE_WORKERS=true
```

and `REDIS_URL` exists.

## 101. Scheduled Jobs

NestJS cron schedules enqueue work:

- Promise breach detection every 15 minutes
- Notification dispatch every 30 minutes
- Credit refresh every 4 hours
- Collection dashboard refresh every 20 minutes

The scheduler enqueues jobs rather than performing all heavy work directly. This keeps scheduling separate from execution and allows retries.

## 102. Job IDs and Deduplication

FinOS creates deterministic job IDs such as:

```text
outbox:<event-id>
credit.profile.refresh:<company-id>:<party-id>
```

This can prevent accidental duplicate jobs while a job with that ID still exists.

Job handlers must still be safe to repeat because queue retention, manual retries, or changed IDs can produce repeated work.

## 103. Audit Logging

Audit records capture:

- Company
- Actor
- Action
- Entity type
- Entity ID
- Before state
- After state
- Request metadata where available

Audit logs answer:

- Who changed it?
- What changed?
- When?
- In which company?
- Why or through which request?

Audit logging is different from application logging:

- Application logs help operate and debug the system.
- Audit logs preserve business and security accountability.

## 104. Document Number Concurrency

Financial documents require unique, sequential-looking numbers.

Two concurrent requests must not receive the same number.

FinOS uses a `DocumentSequence` model and a dedicated number service with transactions and uniqueness constraints.

General principle:

> Never generate critical sequential numbers by reading the last row and adding one without concurrency protection.

---

# Part 13: Accounting Fundamentals

## 105. Double-Entry Accounting

Every journal entry has equal total debits and credits.

This does not mean every line has both. In fact, FinOS rejects a line containing both debit and credit.

The equality is across the complete journal entry.

## 106. Basic Account Types

- Asset: cash, bank, receivables, inventory
- Liability: payables, tax payable, loans
- Equity: owner capital, retained earnings
- Revenue: sales income
- Expense: rent, salaries, cost of goods

## 107. Debit and Credit

Debit does not simply mean bad or money out.

General increases:

- Assets increase with debit.
- Expenses increase with debit.
- Liabilities increase with credit.
- Equity increases with credit.
- Revenue increases with credit.

## 108. Invoice and Payment Example

Sell goods for 1,000:

```text
Debit  Accounts Receivable  1,000
Credit Sales Revenue               1,000
```

Receive payment:

```text
Debit  Cash                 1,000
Credit Accounts Receivable         1,000
```

The customer no longer owes the company, and cash increases.

## 109. Reversal Entry

To reverse:

```text
Original:
Debit  Cash                 1,000
Credit Accounts Receivable         1,000

Reversal:
Debit  Accounts Receivable  1,000
Credit Cash                        1,000
```

FinOS reversal logic swaps each original line's debit and credit.

## 110. Accounting Reports

The API exposes:

- General ledger
- Trial balance
- Profit and loss
- Balance sheet

### General Ledger

All account activity.

### Trial Balance

Balances by account, used to verify debits and credits.

### Profit and Loss

Revenue minus expenses over a period.

### Balance Sheet

Assets, liabilities, and equity at a point in time.

Core equation:

```text
Assets = Liabilities + Equity
```

---

# Part 14: Testing

## 111. Why Test?

Tests protect behavior during change.

Finance software needs tests for:

- Duplicate requests
- Concurrent updates
- Balanced journals
- Tenant isolation
- Allocation limits
- Reversals
- Negative stock prevention
- Token rotation
- Outbox retries

## 112. Unit Test

A unit test checks a small piece of logic with controlled dependencies.

Example:

- Does ledger posting reject unequal debit and credit totals?

## 113. Integration Test

An integration test checks multiple real components together.

Example:

- Does concurrent document numbering produce unique values against a real test database?

## 114. End-to-End Test

An end-to-end test drives the application like a real client:

1. Log in.
2. Select company.
3. Create customer.
4. Create invoice.
5. Post invoice.
6. Create payment.
7. Verify reports.

The current repository has many API Jest specifications but the web package currently reports:

```text
web tests pending
```

Interview-ready improvement:

- Add frontend component tests for forms and state.
- Add browser end-to-end tests for the main financial workflows.
- Keep API integration tests for database invariants and concurrency.

## 115. Arrange, Act, Assert

Common test structure:

```text
Arrange: create inputs and mocks
Act: call the behavior
Assert: verify result and side effects
```

## 116. What to Test for an Invoice

- Invalid tenant customer is rejected.
- Invalid tenant product is rejected.
- Totals are calculated correctly.
- Document number is unique.
- Draft creation does not post accounting.
- Posting creates balanced journal lines.
- Posting optionally reduces inventory.
- A non-draft invoice cannot be posted.
- Reversal creates compensating entries.
- Paid invoice cannot be reversed before payment reversal.
- Audit and outbox records are written.

---

# Part 15: Docker, Deployment, and Operations

## 117. What Is Docker?

Docker packages an application with its runtime and dependencies into a container image.

Benefits:

- More consistent environments
- Easier deployment
- Isolated services
- Repeatable builds

## 118. Dockerfile Stages

FinOS uses multi-stage Dockerfiles:

1. Base image
2. Dependency installation
3. Build
4. Smaller production runner

This avoids shipping all build-time files and tools unnecessarily.

## 119. Docker Compose

`docker-compose.yml` defines:

- PostgreSQL
- Redis
- API
- Web

Service names become internal network hostnames:

- API connects to PostgreSQL at `postgres`.
- API connects to Redis at `redis`.

From the host computer, exposed ports are:

- PostgreSQL: `5432`
- Redis: `6379`
- API: `4000`
- Web: `3000`

## 120. Container Port Configuration Detail

The API source reads `API_PORT`, defaulting to `4000`.

Docker Compose currently sets:

```env
PORT=4000
```

but not `API_PORT`.

It still starts on `4000` because the source default is `4000`, but this is configuration drift. A cleaner Compose file would set `API_PORT=4000` to match the code.

This is an excellent example of why environment variable names must be consistent.

## 121. Build-Time vs Runtime Environment

`NEXT_PUBLIC_API_URL` is used while building browser code. The web Dockerfile accepts it as a build argument.

Some frontend values are embedded at build time, so changing a container runtime variable may not change already-built JavaScript.

Backend secrets are normally read at runtime.

## 122. CI/CD

CI means Continuous Integration. It automatically checks changes.

CD means Continuous Delivery or Deployment.

A good FinOS pipeline should run:

1. Dependency installation with frozen lockfile
2. Prisma validation and generation
3. Type checking
4. Linting
5. Unit and integration tests
6. Production builds
7. Migration safety checks
8. Container vulnerability checks
9. Deployment
10. Post-deployment health checks

## 123. Observability

Observability helps understand system behavior through:

- Logs
- Metrics
- Traces
- Alerts

Useful identifiers:

- Request ID
- Job ID
- Correlation ID
- Company ID
- User ID
- Entity ID

FinOS outbox logs include job, correlation, company, and event information.

Operational alerts should include:

- Growing outbox backlog
- Repeated failed jobs
- Database errors
- Slow endpoints
- Login failure spikes
- Unbalanced accounting attempts
- Reconciliation mismatches

---

# Part 16: Current Implementation Review

## 124. Strong Design Choices

- Clear monorepo separation
- Strict TypeScript base configuration
- Modular NestJS backend
- Global validation
- Password hashing with Argon2
- Hashed refresh and reset tokens
- Refresh token rotation
- Tenant membership guard
- Permission-based authorization
- Tenant-scoped data model
- Financial transactions
- Conditional updates for allocation safety
- Double-entry balance checks
- Explicit reversals
- Document sequence protection
- Transactional outbox
- Retryable BullMQ jobs
- Audit records
- Demo seed data
- Shared frontend API client
- React Hook Form plus Zod
- TanStack Query cache management

## 125. Honest Gaps and Improvement Areas

You should be able to discuss these without attacking the project.

### Frontend Token Storage

Tokens are persisted in browser storage. Consider secure cookie-based refresh handling and stronger XSS controls.

### Refresh Handling

The frontend does not automatically refresh an expired access token and replay the request.

### Frontend Type Safety

The generic module page uses `Record<string, any>` and casts. Generate or share API types and create domain-specific typed hooks.

### Frontend Testing

Web tests are marked pending. Add component and end-to-end coverage.

### Documentation Drift

Some docs describe different ports and endpoint names. Generate API documentation from controllers or OpenAPI and validate docs in CI.

Examples of current source truth:

- Auth uses `/auth/signup`, not `/auth/register`.
- Sales invoices use `/sales/invoices`, not `/invoices`.
- AI CFO uses `/ai-cfo/ask`, not `/ai-cfo/chat`.
- Credit uses `/credit-intelligence/...`, not `/credit/...`.
- API defaults to port `4000`.

### Error Shape

The API client supports multiple possible error shapes. A custom API error filter exists in the repository, but verify it is globally registered before promising one standardized production format.

### Money Arithmetic

Centralize decimal arithmetic and rounding rules instead of repeatedly converting monetary values to JavaScript numbers.

### Idempotency Failure Windows

Define recovery for records left "in progress" by a process crash and consider tighter transaction coordination.

### Queue and Scheduler Deployment

In a horizontally scaled API, every replica may run cron schedules. Separate scheduler and worker roles or use distributed scheduling controls.

### Outbox Recovery

Events claimed as `PROCESSING` need a strategy if the publisher crashes before final status update. Consider a lease timestamp and stale-processing recovery.

### Health Checks

Add explicit liveness and readiness endpoints for API, PostgreSQL, Redis, and workers.

### API Contracts

Use OpenAPI/Swagger or generated clients to keep frontend and backend contracts synchronized.

## 126. How to Speak About Gaps in an Interview

Good answer:

> The current version persists tokens in Zustand storage, which simplified the demo workflow. For production, I would move the refresh token to an HttpOnly secure cookie, keep access tokens short-lived, add refresh rotation handling in the client, and strengthen CSP. I would choose the exact design based on deployment and CSRF requirements.

Weak answer:

> The security is perfect.

Also weak:

> Everything is bad and must be rewritten.

Senior engineering means understanding why a choice exists, its limits, and the proportionate next step.

---

# Part 17: Interview Questions and Model Answers

## 127. Beginner Questions

### What is JSON?

JSON is a text format for structured data. FinOS uses it for HTTP request and response bodies and for flexible event or audit payloads.

### What is React?

React is a component-based UI library. FinOS uses React through Next.js to render forms, tables, navigation, and interactive financial pages.

### What is Next.js?

Next.js is a React framework that provides routing, layouts, builds, and server/client component support. FinOS uses its App Router.

### What is TypeScript?

TypeScript is JavaScript with static types. FinOS uses strict TypeScript to catch errors before runtime and improve maintainability.

### What is an API?

An API is a defined way for software systems to communicate. The FinOS browser calls the NestJS JSON HTTP API.

### What is a database?

A database stores persistent structured data. FinOS uses PostgreSQL and accesses it through Prisma.

### What is `package.json`?

It describes a Node package's scripts, dependencies, name, and version.

### What is `tsconfig.json`?

It configures TypeScript checking and compilation. The web configuration extends shared Next.js settings.

## 128. Intermediate Questions

### Why use both Zod and backend DTO validation?

Zod gives immediate client feedback, but the client cannot be trusted. Backend DTO validation protects the server. Database constraints provide a final integrity layer.

### Why use TanStack Query instead of only `fetch`?

It adds caching, loading and error states, refetching, mutation state, deduplication, and invalidation. The network request may still use `fetch` underneath.

### Why use Zustand?

It provides simple shared browser state. FinOS uses it for session and workspace UI values that are not primarily server-owned data.

### Why separate controller and service?

Controllers handle HTTP concerns. Services contain business rules. This improves testing, reuse, and separation of responsibilities.

### What is dependency injection?

Dependencies are provided to a class by the framework. This avoids hard-coded construction and makes testing and replacement easier.

### What is multi-tenancy?

One application serves multiple companies while isolating each company's data. FinOS scopes records by `companyId` and verifies active membership.

### What is RBAC?

Role-Based Access Control assigns permissions through roles. FinOS also supports membership-specific permissions and checks route requirements with a guard.

### Why use a database transaction?

Related operations must either all commit or all roll back. A payment should not exist without its allocations and accounting entry.

## 129. Advanced Questions

### Explain idempotency in FinOS.

The client sends a unique key for retry-sensitive mutations. The server stores a request hash and response by company, endpoint, and key. A matching retry returns the old response, while a changed payload conflicts.

### Explain the transactional outbox.

The service writes both business data and an event record in one PostgreSQL transaction. A publisher later sends the event to BullMQ. This prevents losing event intent between database commit and queue publication.

### Is the system exactly once?

No distributed queue design should be described casually as exactly once. FinOS uses deterministic IDs, conditional claims, idempotency, and retry-safe handlers to approach exactly-once business effects over at-least-once delivery.

### How does FinOS prevent payment over-allocation?

It verifies totals before the transaction and uses a conditional invoice update requiring enough current `amountDue`. It checks that exactly one row was updated.

### Why reverse instead of delete?

Financial systems need traceability. Reversal preserves the original record and creates compensating journal and stock movements, with audit history.

### How is tenant access enforced?

JWT identifies the user. `x-company-id` selects context. The tenant guard verifies membership. Permissions guard checks allowed action. Services and Prisma queries include `companyId`.

### What can go wrong with cron jobs in multiple API replicas?

Every replica may enqueue the same scheduled work. Deterministic IDs can reduce duplicates, but production may separate scheduler roles or use distributed locks.

### How would you scale this system?

Stateless web and API replicas can scale horizontally. Use managed PostgreSQL, connection pooling, Redis, separate workers, queue monitoring, caching only where correctness allows, database indexes, read optimization, and carefully partitioned background workloads.

### How would you improve financial precision?

Define a money type and rounding policy, avoid uncontrolled JavaScript floating-point calculations, use database decimal values consistently, and test boundary and tax cases.

### How would you prevent tenant leaks?

Require company scoping in repositories, add tenant context types, use composite constraints, write cross-tenant security tests, include company ID in jobs and events, review unscoped admin operations, and optionally add database row-level security.

---

# Part 18: Explain the Project in Interviews

## 130. 30-Second Version

> FinOS is a multi-tenant financial operating system for SMEs. It has a Next.js and React frontend, a modular NestJS API, PostgreSQL with Prisma, and Redis with BullMQ for asynchronous jobs. It covers customers, inventory, invoicing, payments, accounting, collections, banking, credit intelligence, and AI-assisted insights. The design focuses on tenant isolation and financial correctness through transactions, double-entry journals, idempotency, audit logs, reversals, and a transactional outbox.

## 131. Two-Minute Version

> FinOS is a pnpm and Turborepo monorepo with separate web, API, database, and shared TypeScript configuration packages. The frontend uses Next.js 15, React 19, TanStack Query, Zustand, React Hook Form, Zod, and Tailwind. The backend uses NestJS modules organized by business capability. Requests pass through rate limiting, JWT authentication, tenant membership, permission checks, DTO validation, services, and Prisma.
>
> PostgreSQL is the system of record. Most business entities are scoped by company ID. Financial mutations run in transactions, invoice and payment posting creates balanced journal entries, inventory changes are represented as movements, and corrections use explicit reversals. Retry-sensitive requests use idempotency keys. Domain events are written to an outbox in the same transaction as business data, then published to BullMQ for credit, collections, and notification workers.
>
> The main improvements I would prioritize are stronger browser token handling, generated API contracts, frontend and end-to-end tests, centralized decimal arithmetic, and more robust stale outbox and multi-replica scheduler recovery.

## 132. Architecture Decision Examples

### Why PostgreSQL?

Finance needs transactions, constraints, relations, durable storage, and reliable querying.

### Why Prisma?

It provides a typed client, schema management, relation handling, and productive TypeScript integration.

### Why NestJS?

It provides modular structure, dependency injection, guards, validation, and testing support for a large domain API.

### Why Next.js?

It provides React routing, layouts, build tooling, and a path to server-rendered and client-rendered UI.

### Why BullMQ?

It handles retryable asynchronous work in the Node ecosystem using Redis.

### Why an outbox if BullMQ already retries?

BullMQ retries after a job reaches Redis. The outbox solves the earlier failure window between committing PostgreSQL data and publishing the job.

---

# Part 19: Practical Learning Exercises

## 133. Beginner Exercises

1. Write JSON for a customer with name, email, phone, and credit limit.
2. Explain each part of `http://localhost:4000/v1/customers`.
3. Find one `.ts`, `.tsx`, `.json`, `.md`, `.yaml`, and `.prisma` file.
4. Explain the difference between an array and an object.
5. Read `apps/web/src/app/auth/login/page.tsx` and identify component, state, form, mutation, event, and redirect.

## 134. Frontend Exercises

1. Trace `/customers` from its `page.tsx` to `CustomersPage`.
2. Find where loading and error states are displayed.
3. Explain why query invalidation happens after create.
4. Replace one `any` with a proper TypeScript interface.
5. Add a typed customer query hook.
6. Design automatic access-token refresh without creating an infinite retry loop.
7. Write tests for login validation and customer creation.

## 135. Backend Exercises

1. Trace `POST /v1/payments` from controller to service to Prisma.
2. List every business validation in payment creation.
3. Explain why the invoice conditional update is concurrency-safe.
4. Add a test for two allocations competing for the same invoice balance.
5. Trace a permission from decorator to `PermissionsGuard`.
6. Trace company ID from HTTP header to database query.
7. Add a health endpoint checking PostgreSQL and Redis.

## 136. Database Exercises

1. Draw the relationship between company, party, invoice, payment, and allocation.
2. Find five composite unique constraints and explain each.
3. Find five indexes and explain which query each supports.
4. Add a migration in a test branch.
5. Use Prisma Studio to inspect seeded records.
6. Explain why an allocation table is needed between payment and invoice.

## 137. Reliability Exercises

1. Simulate sending the same idempotency key twice.
2. Send the same key with a different payload and explain the conflict.
3. Trace `InvoicePosted` from service to outbox to domain event worker.
4. Explain what happens when Redis is unavailable.
5. Design recovery for an outbox record stuck in `PROCESSING`.
6. Explain how to prevent duplicate scheduled jobs across API replicas.

## 138. Accounting Exercises

1. Create journal lines for a sales invoice without tax.
2. Create journal lines for an invoice with tax.
3. Create journal lines for receiving payment.
4. Reverse the payment lines.
5. Explain why every journal must balance.
6. Test a one-cent rounding edge case.

---

# Part 20: 30-Day Interview Study Plan

## 139. Week 1 - Foundations

Day 1:

- Internet, browser, server, frontend, backend, database
- JSON, object, array, function

Day 2:

- JavaScript and TypeScript basics
- `async`, `await`, promises

Day 3:

- HTTP methods, headers, status codes
- REST and API versioning

Day 4:

- Git basics
- `package.json`, pnpm, scripts

Day 5:

- SQL tables, keys, relations, indexes

Day 6:

- React components, props, state, hooks

Day 7:

- Explain one complete customer request without notes

## 140. Week 2 - Project Stack

Day 8:

- Next.js routing and layouts

Day 9:

- React Hook Form and Zod

Day 10:

- TanStack Query and Zustand

Day 11:

- NestJS modules, controllers, services, DI

Day 12:

- DTOs, pipes, guards, decorators

Day 13:

- Prisma schema and queries

Day 14:

- Draw the whole architecture from memory

## 141. Week 3 - Business and Reliability

Day 15:

- Customer and product flows

Day 16:

- Invoice draft and posting

Day 17:

- Payment allocation and concurrency

Day 18:

- Double-entry accounting

Day 19:

- Reversals and audit logs

Day 20:

- Idempotency

Day 21:

- Transactional outbox, Redis, BullMQ, workers

## 142. Week 4 - Interview Practice

Day 22:

- Authentication and token flow

Day 23:

- Multi-tenancy and RBAC

Day 24:

- Inventory, banking, collections, credit

Day 25:

- Docker and deployment

Day 26:

- Testing strategy

Day 27:

- Performance and scaling

Day 28:

- Review implementation gaps and improvements

Day 29:

- Practice 30-second and 2-minute explanations

Day 30:

- Mock interview: basics, architecture, one deep flow, one failure scenario, one improvement

---

# Part 21: Commands and Reading Map

## 143. Useful Commands

Install:

```powershell
pnpm install
```

Run all development tasks:

```powershell
pnpm dev
```

Run separately:

```powershell
pnpm --filter @finos/api dev
pnpm --filter @finos/web dev
```

Checks:

```powershell
pnpm typecheck
pnpm test
pnpm build
```

Database:

```powershell
pnpm --filter @finos/database prisma:generate
pnpm --filter @finos/database prisma:validate
pnpm --filter @finos/database prisma:migrate
pnpm --filter @finos/database prisma:studio
pnpm --filter @finos/database seed
```

## 144. Best File Reading Order

1. `README.md`
2. `package.json`
3. `pnpm-workspace.yaml`
4. `turbo.json`
5. `apps/web/tsconfig.json`
6. `apps/web/src/app/layout.tsx`
7. `apps/web/src/providers/app-providers.tsx`
8. `apps/web/src/app/auth/login/page.tsx`
9. `apps/web/src/lib/api/client.ts`
10. `apps/web/src/features/module-pages.tsx`
11. `apps/api/src/main.ts`
12. `apps/api/src/app.module.ts`
13. `apps/api/src/shared/rbac/*.ts`
14. One controller, service, repository, and DTO
15. `packages/database/prisma/schema.prisma`
16. `apps/api/src/modules/sales/sales.service.ts`
17. `apps/api/src/modules/payments/payments.service.ts`
18. `apps/api/src/modules/accounting/ledger-posting.service.ts`
19. `apps/api/src/shared/idempotency/idempotency.service.ts`
20. `apps/api/src/modules/automation/*.ts`
21. Relevant `.spec.ts` tests

---

# Part 22: Glossary

- API: interface used by software systems to communicate
- ACID: transaction correctness properties
- Authentication: verifying identity
- Authorization: checking permission
- Backend: server-side application
- BullMQ: Redis-backed job queue library
- Cache: stored data used to avoid repeated work
- CI/CD: automated integration and delivery/deployment
- Client: software calling a server, here usually the browser
- Component: reusable React UI unit
- Concurrency: multiple operations happening during overlapping time
- Controller: NestJS HTTP route handler class
- CORS: browser cross-origin access rules
- CRUD: create, read, update, delete
- CSS: styling language
- Database: persistent structured storage
- Decorator: TypeScript syntax that attaches metadata or behavior
- Dependency injection: framework supplies class dependencies
- Docker: container build and runtime platform
- DTO: validated request or response data shape
- ERP: integrated business operations software
- Event: record that something happened
- Foreign key: reference from one table to another
- Frontend: user-facing browser application
- Guard: NestJS authorization or request admission check
- Hook: React function that connects to state or lifecycle features
- HTTP: web request and response protocol
- Idempotency: safe retry without duplicate effects
- Index: database structure speeding reads
- JSON: text data exchange format
- JWT: signed token format
- Ledger: accounting records grouped by accounts
- Migration: controlled database schema change
- Monorepo: multiple applications/packages in one repository
- Multi-tenancy: multiple isolated customers in one application
- Mutation: operation changing server state
- NestJS: structured Node.js backend framework
- Next.js: React application framework
- Node.js: JavaScript runtime outside the browser
- ORM: maps database rows and relations to program objects
- Outbox: database table holding events for reliable publication
- PostgreSQL: relational database
- Prisma: TypeScript ORM and database toolkit
- Promise: JavaScript representation of future completion
- Queue: ordered background work waiting for processing
- RBAC: role-based access control
- React: component-based UI library
- Redis: in-memory data system used here for queues
- Repository: data-access abstraction
- REST: resource-oriented HTTP API style
- SaaS: software delivered as an online service
- Schema: formal data structure definition
- Service: class containing business logic
- State: data affecting current UI or application behavior
- Tailwind: utility-first CSS framework
- Tenant: one customer organization in shared SaaS
- Transaction: atomic group of database operations
- TSX: TypeScript containing JSX
- TypeScript: typed JavaScript
- Validation: checking input against rules
- Worker: process consuming background jobs
- Zod: TypeScript-first runtime validation library
- Zustand: lightweight React state library

---

# Final Revision Checklist

Before an interview, make sure you can answer these without reading:

1. What problem does FinOS solve?
2. What are frontend, backend, database, and queue?
3. What happens from clicking Save to seeing a new row?
4. Why are both Zod and DTO validation used?
5. How do JWT, company membership, and permissions work together?
6. How does invoice posting affect accounting and inventory?
7. How does payment allocation avoid over-allocation?
8. Why are financial records reversed instead of deleted?
9. What does idempotency protect?
10. What does the transactional outbox protect?
11. Why must background consumers be idempotent?
12. How is tenant data isolated?
13. What would you improve first and why?
14. What is one tradeoff in the generic frontend page abstraction?
15. Can you explain the architecture in 30 seconds and in two minutes?

If you can explain those clearly, trace the relevant files, and discuss both strengths and limitations, you are not merely memorizing the project. You understand it.

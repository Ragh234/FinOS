# API Overview

FinOS exposes a JSON HTTP API through the NestJS backend. APIs are authenticated, tenant-scoped, role-protected, and designed around business operations rather than raw table access.

## Common Conventions

### Base URL

```text
http://localhost:3001
```

Production deployments should expose the API behind HTTPS.

### Authentication

Authenticated requests use a bearer token:

```http
Authorization: Bearer <access_token>
```

Tenant-scoped requests must operate within the authenticated user's active company context.

### Idempotency

Financial mutation APIs should include:

```http
Idempotency-Key: <unique-client-generated-key>
```

The same key with the same payload returns the original response. The same key with a different payload is rejected.

### Error Shape

Errors follow a consistent JSON structure:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "requestId": "req_123"
}
```

## Auth APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Register a user |
| POST | `/auth/login` | Authenticate an active user |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Revoke session |
| POST | `/auth/verify-email` | Verify account email |
| POST | `/auth/request-password-reset` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |

Example login:

```json
{
  "email": "textile.demo@finos.local",
  "password": "Demo@12345"
}
```

Example response:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "usr_123",
    "email": "textile.demo@finos.local"
  }
}
```

## Customer APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/customers` | List customers with search, filters, and pagination |
| POST | `/customers` | Create customer |
| GET | `/customers/:id` | Get customer detail |
| PATCH | `/customers/:id` | Update customer |
| DELETE | `/customers/:id` | Archive or remove customer when allowed |

Example create request:

```json
{
  "displayName": "Apex Retailers",
  "email": "accounts@apex.example",
  "phone": "+91-90000-00000",
  "creditLimit": 250000
}
```

## Product APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/products` | List products |
| POST | `/products` | Create product |
| GET | `/products/:id` | Get product detail |
| PATCH | `/products/:id` | Update product |
| DELETE | `/products/:id` | Archive product when allowed |

Example:

```json
{
  "name": "Cotton Fabric Roll",
  "sku": "FAB-COT-001",
  "unit": "ROLL",
  "salesPrice": 4200,
  "purchasePrice": 3100
}
```

## Inventory APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/inventory/balances` | View stock by product and location |
| POST | `/inventory/adjustments` | Create stock adjustment |
| GET | `/inventory/movements` | List inventory movements |
| GET | `/inventory/locations` | List stock locations |

Inventory writes are protected against negative stock and concurrent decrements.

## Sales APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/invoices` | List invoices |
| POST | `/invoices` | Create invoice |
| GET | `/invoices/:id` | Get invoice detail |
| POST | `/invoices/:id/post` | Post invoice |
| POST | `/invoices/:id/reverse` | Reverse invoice |

Example invoice create:

```json
{
  "customerId": "cust_123",
  "invoiceDate": "2026-06-05",
  "dueDate": "2026-06-20",
  "lines": [
    {
      "productId": "prod_123",
      "quantity": 10,
      "unitPrice": 4200
    }
  ]
}
```

## Payments APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/payments` | List payments |
| POST | `/payments` | Create payment |
| GET | `/payments/:id` | Get payment detail |
| POST | `/payments/:id/allocate` | Allocate payment to invoices |
| POST | `/payments/:id/reverse` | Reverse payment |

Example payment allocation:

```json
{
  "allocations": [
    {
      "invoiceId": "inv_123",
      "amount": 25000
    }
  ]
}
```

## Collections APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/collections/follow-ups` | List collection follow-ups |
| POST | `/collections/follow-ups` | Create follow-up |
| PATCH | `/collections/follow-ups/:id` | Update follow-up |
| DELETE | `/collections/follow-ups/:id` | Delete follow-up when allowed |
| GET | `/collections/promises` | List promises to pay |
| POST | `/collections/promises` | Create promise |
| PATCH | `/collections/promises/:id` | Update promise lifecycle |
| GET | `/collections/dashboard` | Collection workspace aggregates |

## Credit Intelligence APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/credit/customers/:customerId/profile` | Get customer credit profile |
| POST | `/credit/customers/:customerId/refresh` | Refresh credit profile |
| POST | `/credit/risk-scores/refresh` | Refresh risk scores |
| GET | `/credit/command-center` | Credit portfolio aggregates |

Credit scoring is based on existing business data such as receivables, payments, promises, and exposure.

## Banking APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/banking/accounts` | List bank accounts |
| POST | `/banking/accounts` | Create bank account |
| GET | `/banking/transactions` | List bank transactions |
| POST | `/banking/transactions` | Create or import bank transaction |
| POST | `/banking/reconcile` | Reconcile bank transaction |
| GET | `/banking/cash-position` | View cash position |

## Dashboard and AI CFO APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/dashboard/executive` | Executive KPIs and charts |
| GET | `/dashboard/metrics` | Business metrics |
| POST | `/ai-cfo/chat` | Ask grounded finance questions |
| GET | `/ai-cfo/conversations` | List AI CFO conversations |

AI CFO responses should be grounded in available FinOS business data and avoid unsupported claims.

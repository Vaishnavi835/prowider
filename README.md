# Prowider Mini — High Concurrency Lead Distribution System

## Overview

Prowider Mini is a production-oriented lead distribution platform built using **Next.js**, **PostgreSQL**, and **Prisma**.

The system intelligently routes incoming customer leads to service providers using:
- mandatory routing rules
- fair round-robin allocation
- strict quota enforcement
- concurrency-safe database transactions

The primary focus of this project is backend systems engineering, including:
- transactional integrity
- race-condition prevention
- idempotent processing
- fairness persistence
- real-time state streaming

---

# Live Demo
```
https://prowider-ruddy.vercel.app/
```

---

# Demo Video

```txt
https://youtu.be/qmiOpdQ0MGs
```

---

# GitHub Repository

```txt
https://github.com/Vaishnavi835/prowider
```

---

# Tech Stack

| Layer               | Technology |
|---------------------|-- ----------|
| Frontend            | Next.js 15 (App Router) |
| Language            | TypeScript |
| Styling             | Tailwind CSS |
| Database            | PostgreSQL |
| Database Hosting    | Neon.tech |
| ORM                 | Prisma v5 |
| Real-Time Updates   | Server-Sent Events (SSE) |
| Deployment          | Vercel |

---

# Core Features

## Lead Distribution Engine
- Mandatory provider assignment
- Fair round-robin allocation
- Exactly 3 providers guaranteed
- Provider quota enforcement
- Atomic transactional consistency

---

## Concurrency Safety
- Database row-level locking
- Safe simultaneous request handling
- Prevents race conditions
- Prevents duplicate allocations

---

## Duplicate Prevention
- Database-level duplicate lead protection
- Composite unique constraints using:

```prisma
@@unique([phone, serviceId])
```

---

## Webhook Idempotency
- Exactly-once webhook processing
- Prevents accidental duplicate execution
- Transaction-safe idempotency keys

---

## Real-Time Dashboard
- Live provider quota updates
- SSE-powered streaming
- No browser refresh required

---

## Built-In Testing Tools
- Concurrent lead generation
- Webhook idempotency testing
- Quota exhaustion testing
- Allocation fairness verification

---

# Why This Project Is Interesting

Unlike traditional CRUD applications, this project focuses heavily on backend systems engineering concepts such as:

- concurrency control
- transactional consistency
- fairness algorithms
- race-condition prevention
- real-time streaming systems
- idempotent webhook handling
- database-level integrity enforcement

The goal was to simulate production-grade lead allocation reliability under simultaneous traffic conditions.

---

# System Architecture

## Database Architecture (PostgreSQL + Prisma)

The system uses PostgreSQL hosted on Neon.tech with Prisma ORM.

### Core Models

| Model | Purpose |
|---|---|
| Service | Stores available services |
| Provider | Stores provider data and quotas |
| Lead | Stores customer lead submissions |
| LeadAssignment | Maps leads to providers |
| AllocationState | Tracks fair round-robin ordering |
| WebhookIdempotencyKey | Prevents duplicate webhook execution |

---

# Database Constraints

## Duplicate Lead Prevention

```prisma
@@unique([phone, serviceId])
```

Prevents the same customer from submitting duplicate leads for the same service.

---

## Duplicate Provider Assignment Prevention

```prisma
@@unique([leadId, providerId])
```

Ensures the same provider cannot be assigned to the same lead twice.

---

## Webhook Idempotency Enforcement

```prisma
@unique
```

Used on webhook idempotency keys to guarantee exactly-once execution.

---

# Allocation Algorithm

The allocation engine is implemented inside:

```txt
lib/allocate.ts
```

The engine guarantees:
- fairness
- quota enforcement
- transactional consistency
- concurrency safety
- exactly 3 provider assignments

---

## Step 1 — Atomic Transaction

The complete allocation flow is wrapped inside:

```ts
prisma.$transaction()
```

This guarantees:
- all operations succeed together
- or everything rolls back entirely

This prevents:
- orphan leads
- partial allocations
- inconsistent quotas

---

## Step 2 — Lead Creation

A lead is inserted into the database.

If:

```txt
phone + serviceId
```

already exists, PostgreSQL rejects the insert automatically using database constraints.

---

## Step 3 — Mandatory Provider Assignment

Some services require specific providers to always receive the lead.

The allocation engine first assigns these mandatory providers before pool allocation begins.

---

## Step 4 — Fair Round-Robin Allocation

Remaining slots are filled using:
- lowest turn counter
- available quota
- provider availability

The provider with the lowest:

```txt
turnCounter
```

gets selected first.

After assignment:

```txt
turnCounter += 1
```

This ensures long-term fair distribution.

---

## Step 5 — Concurrency Protection

Before selecting providers, the engine executes:

```sql
SELECT ... FOR UPDATE
```

This places row-level locks on allocation rows.

As a result:
- simultaneous requests queue safely
- race conditions are prevented
- quota corruption is impossible

This is the core concurrency-safety mechanism of the project.

---

## Step 6 — Strict 3-Provider Guarantee

Before committing:

```ts
if (assigned.length < 3)
  throw new Error("Insufficient providers available")
```

If exactly 3 providers cannot be assigned:
- the transaction rolls back completely
- no lead is created
- no quotas are updated

This guarantees database consistency.

---

## Step 7 — Turn Counter Normalization

Over time:

```txt
turnCounter
```

would increase infinitely.

To prevent integer overflow:
- if counters exceed a threshold
- the minimum counter is subtracted from all providers

This preserves fairness while keeping numbers small.

---

# How Concurrency Was Handled

Concurrency handling is one of the major engineering focuses of this project.

---

## Problem

If multiple leads arrive simultaneously:
- two requests may assign the same provider
- quotas may become corrupted
- fairness order may break

---

## Solution

### 1. Database Transactions

Every allocation executes inside:

```ts
prisma.$transaction()
```

ensuring atomicity.

---

### 2. Row-Level Locking

The system uses:

```sql
SELECT ... FOR UPDATE
```

to lock allocation rows during assignment.

This prevents:
- duplicate assignments
- quota inconsistencies
- race conditions

---

### 3. Concurrency Stress Testing

The project includes:

```txt
/api/test-tools/bulk-leads
```

which uses:

```ts
Promise.all()
```

to simulate simultaneous traffic spikes.

This validates:
- transactional consistency
- lock safety
- allocation correctness

---

# How Webhook Idempotency Is Ensured

The webhook endpoint:

```txt
/api/webhook/reset-quota
```

must safely handle:
- retries
- duplicate events
- accidental multiple submissions

---

## Idempotency Strategy

Each request includes:

```txt
idempotencyKey
```

The system attempts to insert the key into:

```txt
WebhookIdempotencyKey
```

The key column is protected using:

```prisma
@unique
```

If the key already exists:
- the request is safely ignored

This guarantees:
- exactly-once processing
- no duplicate quota resets
- transactional webhook safety

---

# Real-Time Dashboard Architecture

The dashboard uses:
- Server-Sent Events (SSE)
- native browser EventSource API

The backend streams updates every:

```txt
3 seconds
```

This approach was chosen because:
- lightweight
- simple infrastructure
- ideal for project scale
- lower operational complexity than WebSockets

---

## Future Scalability Options

Potential production upgrades:
- PostgreSQL LISTEN/NOTIFY
- Redis Pub/Sub
- Kafka event streaming
- WebSockets

---

# Prisma Singleton Pattern

The project implements a PrismaClient singleton inside:

```txt
lib/prisma.ts
```

This prevents:
- excessive database connections
- connection pool exhaustion
- Prisma client duplication during hot reloads

Especially important for:
- Next.js development mode
- serverless deployment environments

---

# API Endpoints

| Endpoint | Purpose |
|---|---|
| POST `/api/leads` | Create and allocate leads |
| GET `/api/dashboard/stream` | Real-time dashboard updates |
| POST `/api/webhook/reset-quota` | Reset provider quotas |
| POST `/api/test-tools/bulk-leads` | Concurrency stress testing |

---

# Project Structure

```txt
app/
 ├── api/
 ├── dashboard/
 ├── request-service/
 └── test-tools/

lib/
 ├── allocate.ts
 └── prisma.ts

prisma/
 ├── schema.prisma
 └── seed.ts
```

---

# Local Setup Instructions

## 1. Clone Repository

```bash
git clone https://github.com/your-username/prowider.git
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create:

```txt
.env
```

Add:

```env
DATABASE_URL="your-neon-postgresql-url"
```

---

## 4. Run Prisma Migrations

```bash
npx prisma migrate dev
```

---

## 5. Seed Database

```bash
npx prisma db seed
```

---

## 6. Start Development Server

```bash
npm run dev
```

---

# Deployment (Vercel)

## Steps

1. Push repository to GitHub
2. Import repository into Vercel
3. Add:

```env
DATABASE_URL
```

4. Deploy

---

# Testing Instructions

## Duplicate Lead Test

Submit the same:
- phone number
- service

twice.

Expected:
- second request rejected with:

```txt
409 Conflict
```

---

## Concurrency Test

Navigate to:

```txt
/test-tools
```

Run:
- bulk lead generation

Expected:
- fair allocation maintained
- quotas respected
- no duplicate assignments

---

## Webhook Idempotency Test

Trigger webhook multiple times using the same:

```txt
idempotencyKey
```

Expected:
- only first request executes
- duplicates safely ignored

---

# Engineering Highlights

This project demonstrates:
- ACID transactional consistency
- row-level locking
- concurrency-safe backend architecture
- fairness algorithms
- real-time streaming systems
- webhook idempotency
- database-level integrity enforcement

---

# Future Improvements

Potential production enhancements:
- Redis caching
- WebSocket architecture
- Kafka event queues
- retry queues
- provider priority weighting
- analytics dashboards
- audit logging
- rate limiting
- distributed event processing

---

# Author

**Vaishnavi T**

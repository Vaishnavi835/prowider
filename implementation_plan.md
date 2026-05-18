# Prowider Mini: Complete System Architecture & Implementation Plan

## 1. Project Overview
**Prowider Mini** is a production-ready, full-stack Next.js web application designed to handle high-concurrency lead distribution. It intelligently routes incoming customer service requests to a pool of service providers based on strict mandatory routing rules and a perfectly balanced round-robin rotation.

---

## 2. Technology Stack
- **Frontend & API:** Next.js 15 (App Router) with TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL (Hosted on Neon.tech)
- **ORM:** Prisma v5 (with Client Singleton pattern implemented in `lib/prisma.ts`)
- **Real-Time Communication:** Server-Sent Events (SSE) using the native browser `EventSource` API
- **Deployment:** Vercel

---

## 3. Database Architecture (Prisma)
The database schema consists of 6 optimized models enforcing strict data integrity constraints. 

### Database Constraints
To ensure data integrity and atomicity at the database level (rather than just relying on application logic), we utilize the following constraints:
- **`@@unique([phone, serviceId])` on `Lead`**: Enforced at the database level to actively prevent the same customer from submitting duplicate leads for the same service.
- **`@@unique([leadId, providerId])` on `LeadAssignment`**: Prevents the exact same provider from accidentally being assigned the exact same lead twice during edge-case races.
- **`@unique` on `WebhookIdempotencyKey`**: Makes the idempotency check atomic. By relying on a unique constraint for the key column, any duplicate webhook events firing sequentially will cause the database to actively reject the duplicate `INSERT`, completely preventing double-processing.

### Models
- **`Service` & `Provider`**: The core entities holding service types and provider quota limits.
- **`Lead`**: Captures customer details (protected by the constraints mentioned above).
- **`LeadAssignment`**: An associative table mapping exactly 1 Lead to 1 Provider.
- **`AllocationState`**: A high-performance tracking table maintaining the `turnCounter` for each provider in a service pool to determine round-robin order.
- **`WebhookIdempotencyKey`**: A security table storing unique transaction keys to guarantee webhook endpoints are processed exactly once.

---

## 4. Core Allocation Engine (The Backend Logic)
The routing engine (`lib/allocate.ts`) is designed to handle extreme concurrency spikes without race conditions.

### The ACID Transaction Pipeline
Lead creation and provider allocation are wrapped inside a single atomic Prisma `$transaction`. 
1. **Lead Creation:** Attempts to insert the lead. If the `phone + serviceId` is a duplicate, the transaction safely aborts.
2. **Mandatory Routing:** Automatically assigns predefined providers for specific services (e.g., Service 1 always goes to Provider 1).
3. **Round-Robin Pooling:** Scans the `AllocationState` table to find the providers with the lowest turn counter.
4. **Strict Guarantee Validation:** Before committing, the engine validates that exactly 3 providers have been successfully assigned. If quotas are exhausted and 3 cannot be found, the entire transaction rolls back, leaving zero orphan leads.

### Concurrency Safety (Row-Level Locking)
To handle the possibility of 10+ leads arriving at the exact same millisecond, the system uses a direct SQL `SELECT ... FOR UPDATE` query. This places a row-level lock on the provider pool, forcing concurrent requests to queue sequentially. This prevents race conditions where two simultaneous leads might accidentally assign the same exhausted provider.

### Turn Counter Normalization
Over time, the round-robin `turnCounter` would increase infinitely. To prevent integer overflow, the engine periodically detects if the minimum counter in a pool exceeds `10,000`. If so, it dynamically subtracts that minimum from every provider in the pool, resetting the numbers while perfectly preserving the mathematical round-robin order.

---

## 5. API & Webhook Layer

### Webhook & Event Ingestion
- **`POST /api/leads`**: The main ingestion endpoint. Invokes the core allocation engine.
- **`GET /api/dashboard/stream`**: Utilizes standard Server-Sent Events (SSE) to push live database updates to the provider dashboard every 3 seconds. On the client side, the browser consumes this seamlessly using the native `EventSource` API, rendering live state updates via React hooks.
- **`POST /api/webhook/reset-quota`**: An idempotent webhook that securely resets provider quotas. It checks the `WebhookIdempotencyKey` table in the same transaction to completely neutralize double-clicks or duplicate external events.

### HTTP Error Handling Strategy
The API is designed to return highly semantic, standard HTTP status codes mapping perfectly to the system's operational states:
- **`409 Conflict`**: Returned when the database raises a duplicate lead key constraint violation (`P2002` on `phone` and `serviceId`). This signals that the request was syntactically valid but represents a duplicate attempt.
- **`422 Unprocessable Entity`**: Returned when the allocation engine runs but fails to fulfill the business rules (such as our Strict 3-Provider Quota Guarantee). It represents semantic validation errors where the server understands the request but cannot process the execution due to exhausted quotas.
- **`500 Internal Server Error`**: Returned as a catch-all safety buffer for unexpected server-side crashes, protecting database schema leaks from reaching frontend clients while logging detailed traces securely on the server.

---

## 6. Testing & Quality Assurance
The application features a built-in **Test Tools Panel** to allow evaluators to verify the backend engineering instantly:
- **Concurrency Test:** Uses `Promise.all` to fire 10 simultaneous leads at the exact same millisecond, visibly proving the `SELECT FOR UPDATE` transaction locking works.
- **Idempotency Test:** Calls the webhook 5 times with the exact same idempotency key to prove only the first call executes, while calls 2-5 are safely rejected.

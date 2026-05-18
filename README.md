# Prowider Mini Lead Distribution System

## 1. PROJECT OVERVIEW
Prowider Mini is an intelligent lead distribution system designed to fairly and reliably route customer service requests to a pool of service providers. It handles mandatory provider assignments alongside a round-robin "fair pool" rotation, complete with real-time dashboard updates and robust concurrency handling for high-volume scenarios.

## 2. LIVE DEMO
Placeholder: [your Vercel URL here]

## 3. TECH STACK
- **Frontend & API:** Next.js (App Router), TypeScript, Tailwind CSS
- **Database:** PostgreSQL (via Neon.tech)
- **ORM:** Prisma
- **Deployment:** Vercel

## 4. SETUP INSTRUCTIONS
1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd prowider
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   - Copy `.env.example` to `.env`
   - Create a free PostgreSQL database on [Neon.tech](https://neon.tech)
   - Update the `DATABASE_URL` in your `.env` file with your Neon connection string.

4. **Initialize Database:**
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

## 5. ENGINEERING DECISIONS

### a) PRISMACLIENT SINGLETON
In Next.js and serverless environments, files frequently re-execute. If `new PrismaClient()` is called arbitrarily, it leads to database connection pool exhaustion. A global singleton pattern (`lib/prisma.ts`) is strictly enforced to ensure exactly ONE connection pool is maintained per Node process, preventing fatal connection leaks.

### b) FULL TRANSACTIONAL CONSISTENCY
Lead creation and provider allocation are wrapped entirely inside a single atomic Prisma `$transaction`.
- **Why it matters:** If the allocation engine fails to find enough providers, or if a database constraint fails, the entire transaction rolls back. This provides true ACID guarantees. No "orphan leads" are created without providers, and no provider quotas are dirty-incremented on partial failures.

### c) STRICT 3-PROVIDER GUARANTEE
Enforcing core business rules at the transaction layer: Before the transaction commits, the system explicitly validates `if (assigned.length < 3) throw new Error(...)`. This ensures that we never violate the rule of exactly 3 providers per lead. It acts as a hard backstop for data integrity.

### d) CONCURRENCY HANDLING & ROW LOCKING
The system is designed to handle multiple leads arriving at the exact same millisecond.
- **The Problem:** Without locking, two concurrent requests might read the same `turnCounter`, pick the same provider, and bypass quotas.
- **The Solution:** We use Prisma's `$queryRaw` to perform a `SELECT ... FOR UPDATE` on the `AllocationState` table. This enforces database-level row locks, serializing access to the pool state so each concurrent request gets a correct, updated view of the rotation without race conditions.

### e) TURN COUNTER NORMALIZATION
Over long periods of time, `turnCounter` values increment infinitely, which could eventually cause integer overflow. 
- **The Solution:** Inside the allocation transaction, the system dynamically checks if the lowest counter in a service pool exceeds a predefined threshold (`10,000`). If so, it subtracts this minimum value from all providers in that pool.
- **Fairness Preservation:** Subtracting a constant from all providers in the pool perfectly maintains their relative numerical order, ensuring the round-robin sequence remains untouched while preserving database integer health.

### f) WEBHOOK IDEMPOTENCY
Quota resets are handled via a webhook, mimicking real-world payment gateway confirmations (like Stripe).
- **Safety:** The webhook expects an `idempotencyKey`. It attempts to insert this key into the `WebhookIdempotencyKey` table.
- **Atomicity:** The key insertion and quota reset happen in the same database `$transaction`.
- **Duplicate Prevention:** If a duplicate key arrives, the unique constraint throws a `P2002` error. The system catches this and safely returns success without re-running the quota reset, ensuring identical requests don't cause unintended side effects.

### g) DATABASE-LEVEL DUPLICATE PREVENTION
To prevent a user from submitting multiple leads for the same service, we enforce an `@@unique([phone, serviceId])` constraint on the `Lead` model. When the constraint is violated, Prisma throws a `P2002` error, which the API cleanly catches and maps to a user-friendly 409 Conflict HTTP response.

### h) REAL-TIME UPDATES (SSE)
The provider dashboard updates in real-time using Server-Sent Events (SSE) via database polling at `/api/dashboard/stream`.
- **Trade-offs:** Polling was intentionally chosen for simplicity, statelessness, and lower infra complexity (no external Redis needed). It perfectly handles the unidirectional server-to-client requirement.
- **Future Scale:** For hyper-scale production, this could be swapped to PostgreSQL `LISTEN/NOTIFY` or Redis Pub/Sub to eliminate the overhead of repeated database queries.

## 6. PAGES
1. **`/request-service`**: Customer-facing form to submit leads with real-time feedback.
2. **`/dashboard`**: Real-time provider dashboard showing assigned leads and current quota usage via SSE.
3. **`/test-tools`**: Engineering control panel to execute concurrency, idempotency, and quota reset tests.

## 7. WHAT THE EVALUATORS CAN TEST
- **Duplicate Prevention:** Submit a lead for Service 1. Submit the exact same phone number for Service 1 again -> Expect a 409 Error.
- **Concurrency:** Go to Test Tools and click "Generate 10 Simultaneous Leads" -> Expect all 10 to succeed with exactly 3 providers each, zero duplicates.
- **Idempotency:** Go to Test Tools and click "Call Webhook 5 Times" -> Expect only the first call to reset quotas; calls 2-5 will return "Already processed".
- **Real-Time SSE:** Open the Dashboard in Tab 1. Open Request Service in Tab 2. Submit a lead -> Expect Tab 1 to visually update within 3 seconds without refreshing.
- **Strict Guarantee:** Exhaust provider quotas artificially, then attempt to submit a lead -> Expect a 422 Unprocessable Entity error because the strict 3-provider rule couldn't be fulfilled.

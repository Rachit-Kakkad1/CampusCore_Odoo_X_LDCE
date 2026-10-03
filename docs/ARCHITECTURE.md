# Student Organization System — Architecture & Engineering Patterns

This document describes the layered backend architecture and shared engineering contracts implemented across the **Odoo × LDCE Student Organization Management MVP**.

---

## 1. Architectural Layers

The backend follows a strict 4-layer separation of concerns:

```text
HTTP Request
     ↓
[ Route Layer ]       (routes.js)        — Defines endpoints, mounts HTTP methods, applies auth/role middleware
     ↓
[ Controller Layer ]  (controller.js)    — Parses requests, validates inputs, catches errors, formats HTTP responses
     ↓
[ Service Layer ]     (service.js)       — Enforces core business logic, permissions, atomic workflows, and date/status computations
     ↓
[ Repository Layer ]  (repository.js)   — Executes raw parameterized PostgreSQL queries, transactions, and row locks
     ↓
[ PostgreSQL Database ]                 — Stores relations, guarantees constraints, foreign keys, unique constraints, and ACID properties
```

### Layer Rules
1. **Routes**: Contain **NO** business logic or SQL. Only routing and middleware.
2. **Controllers**: Never execute SQL queries directly. Validate request payloads and delegate to services.
3. **Services**: Contain domain business rules (e.g., ticket price determination, membership active checks, transaction calls). Coordinate multi-step operations within database transactions.
4. **Repositories**: Encapsulate all database queries using `pg`. Use parameterized statements (`$1, $2, ...`) exclusively to prevent SQL injection.

---

## 2. Shared Foundation Contracts (`backend/shared/`)

Shared functionality is modularized in `backend/shared/` to ensure zero code duplication between modules (Auth, Membership, Events, Shop, Finance):

```text
backend/shared/
├── auth/
│   ├── getCurrentUser.js       — Extracts user { id, name, email, role } from Bearer JWT
│   ├── requireAuth.js          — Middleware enforcing authenticated session (401 UNAUTHORIZED)
│   └── requireRole.js          — Middleware factory for role authorization (403 FORBIDDEN)
│
├── membership/
│   └── isActiveMember.js       — Determines active status (dues_status = 'paid' AND expiry_date >= CURRENT_DATE)
│
├── transactions/
│   └── createTransaction.js    — Enforces financial idempotency via UNIQUE(source_type, source_id)
│
└── qr/
    ├── signTicketCode.js       — HMAC-SHA256 10-hex character signature generator
    ├── generateQR.js           — Formats payload: <ticket_code>.<signature> and base64 PNG data URL
    └── verifyQR.js             — Pure constant-time cryptographic signature verification
```

### Shared Function Details

| Function | Signature | Contract / Guarantee |
| :--- | :--- | :--- |
| **`getCurrentUser`** | `getCurrentUser(req)` | Returns `{ id, name, email, role }` or `null`. |
| **`requireAuth`** | `requireAuth(req, res, next)` | Sets `req.user` or returns `401`. |
| **`requireRole`** | `requireRole(...roles)` | Checks `req.user.role IN roles` or returns `403`. |
| **`isActiveMember`** | `isActiveMember(userId, [client])` | Returns `true` strictly when `dues_status = 'paid'` AND `expiry_date >= CURRENT_DATE`. |
| **`createTransaction`**| `createTransaction(params, [client])` | Idempotent via `ON CONFLICT (source_type, source_id) DO NOTHING`. Returns created or existing row. |
| **`signTicketCode`** | `signTicketCode(ticketCode)` | First 10 hex characters of `HMAC_SHA256(ticket_code, QR_SECRET)`. |
| **`generateQR`** | `generateQR(ticketCode)` | Returns `{ payload, qrDataUrl, signature, ticketCode }`. |
| **`verifyQR`** | `verifyQR(payload)` | Pure cryptographic validator comparing signatures via `crypto.timingSafeEqual`. |

---

## 3. Concurrency & Transaction Patterns

### A. Atomic Ticket Payment with Seat Locking
To prevent the classic oversell race condition when only 1 seat remains:
```javascript
// Step 1: Open database transaction
await client.query('BEGIN');

// Step 2: Lock event row with FOR UPDATE
const event = await eventRepository.getEventByIdForUpdate(ticket.event_id, client);

// Step 3: Check seat capacity
if (event.seats_remaining <= 0) {
  throw new Error('NO_SEATS_AVAILABLE');
}

// Step 4: Decrement seat atomically
await eventRepository.decrementSeat(event.id, client);

// Step 5: Mark ticket paid
await eventRepository.markTicketPaid(ticket.id, client);

// Step 6: Create financial ledger entry (idempotent)
await createTransaction({ source_type: 'ticket', source_id: ticket.id, ... }, client);

// Step 7: Commit transaction
await client.query('COMMIT');
```

### B. Dynamic Pricing Rule
Role alone does not determine discounts. Both ticket purchasing and merchandise pricing call:
```javascript
const isMember = await isActiveMember(userId);
const price = isMember ? event.member_price : event.non_member_price;
```
* **Immutability**: Ticket price is locked at purchase time. Subsequent membership expiration never alters the purchased ticket price.
* **Admission**: An expired member's valid ticket is still admitted at the door, but the scanner clearly indicates `Member: EXPIRED`.

---

## 4. Module Directory Structure

```text
backend/
├── app.js                          — Express application setup & route mounting
├── server.js                       — Server entry point
├── config/
│   ├── database.js                 — PostgreSQL connection pool via pg
│   └── env.js                      — Environment variables loader
├── db/
│   ├── schema.sql                  — 14 core database tables, constraints, indexes
│   ├── seed.sql                    — Seed data with demo personas
│   └── verify.js                   — 60 automated database verification tests
├── shared/                         — Shared auth, membership, transaction, and QR contracts
├── modules/
│   ├── auth/                       — User registration, login, and /auth/me
│   ├── membership/                 — Dues payment, member pass, and renewal reminders
│   ├── announcements/              — Broadcast announcements feed and admin creation
│   └── events/                     — Events management, ticketing, and door check-in
└── tests/                          — Comprehensive automated test suites
```

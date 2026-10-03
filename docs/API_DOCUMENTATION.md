# Student Organization System — Complete API Documentation

This document provides unified documentation for all backend modules in the **Odoo × LDCE Student Organization Management MVP**.

All endpoints are accessible via direct paths (e.g. `/events`, `/tickets`, `/membership`) and via `/api` prefixed paths (e.g. `/api/events`, `/api/tickets`, `/api/membership`) for complete interoperability across all frontend and testing clients.

---

## 1. System Health
* `GET /health` or `GET /api/health` — Central health check endpoint (returns `{"status": "ok", "service": "student-organization-system"}`).

---

## 2. Shared Function Contracts (`backend/shared/`)

### A. Auth Contracts (`backend/shared/auth/`)
* **`getCurrentUser(req)`**: Extracts `{ id, name, email, role }` or `null` from Bearer JWT.
* **`requireAuth`**: Middleware enforcing authenticated session (`401 UNAUTHORIZED`).
* **`optionalAuth`**: Middleware extracting user if Bearer token is provided, while allowing guest requests to proceed unauthenticated.
* **`requireRole(...roles)`**: Middleware factory restricting endpoint access to specific roles (`403 FORBIDDEN`). Permitted roles: `admin`, `treasurer`, `event_manager`, `volunteer`, `member`. (Note: `guest` is NOT a system user role).

### B. Membership Contracts (`backend/shared/membership/`)
* **`isActiveMember(userId, [client])`**: Returns `true` strictly when `status = 'active' AND dues_status = 'paid' AND expiry_date > NOW()`. Returns `false` for expired, cancelled, pending, or unpaid memberships, and guest attendees (`userId = null`).
* **`getMembershipStatus(userId, [client])`**: Returns `{ status, started_at, expiry_date, days_remaining, is_active, membership }` with status in `ACTIVE`, `EXPIRED`, `PENDING`, `CANCELLED`, `NONE`.
* **`syncMembershipStatuses([client])`**: Idempotent backend service that transitions active memberships to `expired` when `expiry_date <= NOW()`. Runs on startup, periodic interval, and before sensitive operations.

### C. Financial Ledger Contracts (`backend/shared/transactions/`)
* **`createTransaction(params, [client])`**: Idempotent financial ledger entry via `UNIQUE(source_type, source_id)`.

### D. QR Code & Cryptographic Contracts (`backend/shared/qr/`)
* **`signTicketCode(ticketCode)`**: Computes first 10 hex characters of `HMAC_SHA256(ticket_code, QR_SECRET)`.
* **`generateQR(ticketCode)`**: Formats payload as `<ticket_code>.<signature>` and creates base64 PNG data URL.
* **`verifyQR(payload)`**: Pure constant-time cryptographic signature verification.

---

## 3. Authentication API (`/auth` or `/api/auth`)

* `POST /auth/register` — Register new system user (default role: `member`). Automatically creates pending membership.
* `POST /auth/login` — Login with credentials; returns JWT token and safe user profile.
* `GET /auth/me` — Profile of authenticated user (requires `requireAuth`).

---

## 4. Membership Lifecycle API (`/membership` or `/api/membership`, `/members` or `/api/members`)

* `GET /membership/me` — Current user membership details, lifecycle status (`ACTIVE`, `EXPIRED`, `PENDING`, `CANCELLED`, `NONE`), and days remaining.
* `POST /membership/pay` — Pay annual dues. Automatically calculates expiry date via PostgreSQL interval (`NOW() + INTERVAL '1 year'`), activates membership (`PENDING -> ACTIVE`), and creates dues transaction in the ledger.
* `POST /membership/cancel` — Cancel active/pending membership. Updates `status = 'cancelled'`, `cancelled_at = NOW()`, `cancellation_reason`. Preserves historical record (never deletes).
* `POST /membership/renew` — Renews membership into a new period linked to previous history via `renewed_from_membership_id`.
* `GET /membership/pass` — Digital member pass card details including member code, validity status, and days remaining.
* `GET /membership/history` or `GET /membership/history/:userId` — Complete historical timeline of membership periods and renewals.
* `GET /membership/verify/:memberCode` — Public verification of a member code.
* `GET /membership/dashboard` — Admin/Treasurer overview reporting `total_active`, `expiring_7_days`, `expiring_30_days`, `expired`, `pending`, and `cancelled`.
* `GET /membership/expiring` — List memberships expiring within 30 days (Admin / Treasurer).
* `POST /membership/sync` — Trigger idempotent status synchronization job.
* `GET /members` or `GET /membership` — Full membership roster with status filters and member search (Admin / Treasurer).


---

## 5. Announcements API (`/announcements` or `/api/announcements`)

* `GET /announcements` — List announcements chronologically with author attribution.
* `POST /announcements` — Post new announcement (Admin / Event Manager).

---

## 6. Events & Tickets Module (`/events` or `/api/events`, `/tickets` or `/api/tickets`, `/checkin` or `/api/checkin`)

* `GET /events` — List upcoming events with available seats and tiered pricing.
* `GET /events/:id` — Event details.
* `POST /events` — Create event with capacity and tiered pricing (Admin / Event Manager).
* `GET /events/:id/stats` — Real-time event stats: capacity, seats remaining, tickets sold, tickets checked in, revenue (Admin / Event Manager / Treasurer).
* `POST /events/:id/tickets` or `POST /events/:id/register` — Ticket checkout supporting two valid registration flows:
  * **Flow A (Registered User / Member)**: Requires JWT Bearer token. Prices dynamically based on `isActiveMember(userId)`. Stores `tickets.user_id = user.id, tickets.attendee_id = NULL`.
  * **Flow B (Public Event Guest Attendee)**: No system account required. Pass `{ name, email, mobile }` in body. Automatically registers into `event_attendees`, charges `non_member_price`, and stores `tickets.user_id = NULL, tickets.attendee_id = attendee.id`.
* `POST /tickets/:id/pay` — Atomic payment with row lock (`FOR UPDATE`), seat decrement, ticket status update, and transaction ledger entry. Works for both user and guest attendee tickets.
* `GET /tickets/mine` — All tickets purchased by current user (requires `requireAuth`).
* `GET /tickets/:id/qr` — Generate signed QR payload and image for a valid paid ticket (supports both user and attendee tickets).
* `POST /checkin/scan` — Door check-in scanning endpoint with HMAC validation, duplicate scan prevention (`ALREADY_USED`), expired member admission (`VALID` with `Member: EXPIRED`), and guest attendee admission (`VALID` with `Member: NONE`, holder: `attendee`).

---

## 7. Merchandise & Orders Module (`/products`, `/orders`, `/merchandise` or `/api/merchandise`)

* `GET /products` — Product catalog with sizes, prices, and stock levels.
* `GET /products/:id` — Product details.
* `POST /products` — Create product (Admin).
* `PUT /products/:id/stock` — Update stock levels (Admin).
* `POST /orders` — Create pending order with cart items (does not decrement stock yet).
* `POST /orders/:id/pay` — Atomic order payment with size stock verification and decrement.
* `GET /orders/mine` — User's order history.
* `GET /orders` — All orders (Admin / Treasurer).
* `GET /orders/:id` — Single order details.

---

## 8. Finance & Fundraisers Module (`/finance` or `/api/finance`)

* `GET /finance/summary` — Financial ledger summary (income by source, reimbursed expenses, balance).
* `GET /finance/transactions` — All financial transactions.
* `GET /finance/owing` — List of users with pending dues or orders.
* `POST /finance/fundraiser-income` — Record fundraiser income entry.
* `GET /expenses` — List submitted expenses.
* `POST /expenses` — Submit expense receipt.
* `PUT /expenses/:id/approve` — Approve expense (Treasurer).
* `POST /expenses/:id/reimburse` — Reimburse approved expense (creates transaction).
* `GET /fundraisers` — List fundraisers and progress %.
* `POST /fundraisers` — Create fundraiser.
* `POST /fundraisers/:id/tasks` — Add task to fundraiser.
* `PATCH /tasks/:id/status` — Update task status.

# API Documentation — CampusCore Student Organization System

This document outlines the working and planned API endpoints for the 24-hour Odoo × LDCE Hackathon.
All endpoints are served under the `/api` prefix.

---

## 1. System Health
- `GET /api/health`
  - **Auth**: None
  - **Status**: 200 OK
  - **Response**:
    ```json
    { "status": "ok" }
    ```

---

## 2. Authentication Module (`/api/auth`) — *Owner: Nishit*

### `POST /api/auth/register`
- **Auth**: Public
- **Description**: Creates a new user account with hashed password (`bcryptjs`, 10 rounds). Automatically issues a 24h JWT.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@ldce.ac.in",
    "password": "Password123!",
    "role": "member"
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "user": {
        "id": 10,
        "name": "Jane Doe",
        "email": "jane@ldce.ac.in",
        "role": "member",
        "created_at": "2026-10-03T06:00:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
  - `400 Bad Request`: Validation failure (missing fields, invalid email format, password < 6 chars)
  - `409 Conflict`: Email already registered

### `POST /api/auth/login`
- **Auth**: Public
- **Description**: Validates user credentials and issues a JWT containing `{ userId, email, role }`.
- **Request Body**:
  ```json
  {
    "email": "jane@ldce.ac.in",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "user": {
        "id": 10,
        "name": "Jane Doe",
        "email": "jane@ldce.ac.in",
        "role": "member",
        "created_at": "2026-10-03T06:00:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
  - `400 Bad Request`: Missing email or password
  - `401 Unauthorized`: Invalid email or password

### `GET /api/auth/me`
- **Auth**: Bearer `<token>` (`requireAuth`)
- **Description**: Returns authenticated profile for the caller.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "user": {
        "id": 10,
        "name": "Jane Doe",
        "email": "jane@ldce.ac.in",
        "role": "member",
        "created_at": "2026-10-03T06:00:00.000Z"
      }
    }
    ```
  - `401 Unauthorized`: Missing, invalid, or expired JWT

---

## 3. Membership Module (`/api/membership`) — *Owner: Nishit*

### Architecture & Design Rules
- **Routes → Controller → Service → Repository → PostgreSQL**: Strict separation of concerns. Parameterized queries only.
- **Membership Lifecycle**:
  ```
  PENDING (unpaid) ──[ pay ]──> ACTIVE (paid, expiry: +1 year)
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
          EXPIRED (expiry <= NOW)       CANCELLED (reason preserved)
                  │                               │
                  └──────────[ renew ]────────────┘
                                  │
                                  ▼
                         NEW PENDING MEMBERSHIP
                 (renewed_from_membership_id = old_id)
  ```
- **Active Member Rule**:
  `status = 'active' AND dues_status = 'paid' AND expiry_date > NOW()`
  (Evaluated centrally in `backend/shared/membership/isActiveMember.js` and `getMembershipStatus.js`).
- **Dynamic Expiry Categories**:
  - `critical` (`expiring_7_days`): `daysRemaining <= 7`
  - `expiring soon` (`expiring_30_days`): `daysRemaining <= 30`
  - `normal`: `daysRemaining > 30`
  - `expired`: past expiry date
  *(Calculated dynamically on read — never stored as a rigid database status).*
- **Renewal Model**: Historical records are **never overwritten or hard deleted**. A new membership row is inserted referencing `renewed_from_membership_id`.

### `GET /api/membership/dashboard`
- **Description**: Returns real-time aggregated metrics computed efficiently in PostgreSQL using SQL filter aggregations.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "totalActive": 4,
      "expiring7Days": 1,
      "expiring30Days": 2,
      "expired": 2,
      "pending": 1,
      "cancelled": 1
    }
  }
  ```

### `GET /api/membership/:userId`
- **Description**: Retrieves current membership record with derived status, remaining days, and dynamic category.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "exists": true,
      "status": "active",
      "startedAt": "2026-07-03T09:00:00.000Z",
      "expiryDate": "2027-07-03T09:00:00.000Z",
      "daysRemaining": 273,
      "isActive": true,
      "expiryCategory": "normal",
      "membership": {
        "id": 1,
        "user_id": 5,
        "member_code": "SKY-MEM-005-MAYA",
        "status": "active",
        "dues_status": "paid",
        "dues_amount": "500.00",
        "started_at": "2026-07-03T09:00:00.000Z",
        "expiry_date": "2027-07-03T09:00:00.000Z",
        "daysRemaining": 273,
        "isActive": true,
        "expiryCategory": "normal"
      }
    }
  }
  ```

### `GET /api/membership/:userId/history`
- **Description**: Returns all membership periods (active, expired, renewed, cancelled) ordered newest first. Demonstrates preservation of historical records.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "id": 3,
        "member_code": "SKY-MEM-006-EDDIE-2026",
        "status": "active",
        "dues_status": "paid",
        "renewed_from_membership_id": 2,
        "created_at": "2026-08-03T09:00:00.000Z"
      },
      {
        "id": 2,
        "member_code": "SKY-MEM-006-EDDIE-2025",
        "status": "expired",
        "dues_status": "paid",
        "renewed_from_membership_id": null,
        "created_at": "2025-08-03T09:00:00.000Z"
      }
    ]
  }
  ```

### `POST /api/membership`
- **Description**: Creates a new membership in `pending` status.
- **Body**: `{ "user_id": 8, "dues_amount": 500.00 }`
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Membership initiated successfully",
    "data": {
      "id": 9,
      "user_id": 8,
      "member_code": "SKY-MEM-008-A1B2C3",
      "status": "pending",
      "dues_status": "pending"
    }
  }
  ```

### `POST /api/membership/:id/pay`
- **Description**: Simulates dues payment. Transitions `pending` → `active`, sets `dues_status = 'paid'`, calculates `expiry_date = started_at + 1 year`, and records an entry in `transactions`. Idempotent: returns `409 Conflict` if already paid.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Membership dues paid successfully. Membership activated for 1 year.",
    "data": {
      "id": 9,
      "status": "active",
      "dues_status": "paid",
      "started_at": "2026-10-03T14:00:00.000Z",
      "expiry_date": "2027-10-03T14:00:00.000Z"
    }
  }
  ```

### `PATCH /api/membership/:id/cancel`
- **Description**: Gracefully cancels an active/pending membership. Preserves historical dates and records `cancellation_reason`. Never hard-deletes.
- **Body**: `{ "reason": "Student graduated" }`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Membership cancelled successfully",
    "data": {
      "id": 1,
      "status": "cancelled",
      "cancellation_reason": "Student graduated",
      "cancelled_at": "2026-10-03T14:00:00.000Z"
    }
  }
  ```

### `POST /api/membership/:id/renew`
- **Description**: Renews an expired or cancelled membership. Creates a **new** membership row linked via `renewed_from_membership_id` inside an atomic PostgreSQL transaction.
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Membership renewed successfully. New pending membership created.",
    "data": {
      "id": 10,
      "user_id": 4,
      "member_code": "SKY-MEM-004-D4E5F6",
      "status": "pending",
      "renewed_from_membership_id": 5
    }
  }
  ```

---

## 4. Announcements Module (`/api/announcements`) — *Owner: Nishit*

### Features Supported
- **Priorities**: `normal`, `important`, `urgent` (validated against enum).
- **Categories**: `general`, `event`, `urgent`, `academic`, `membership`, `finance` (validated against enum).
- **Publication States**: `draft`, `published`. Only published announcements appear in public feeds.
- **Search**: Case-insensitive substring matching using parameterized PostgreSQL `ILIKE` on `title` and `body`.
- **Pagination**: SQL `LIMIT / OFFSET` with `total` and `totalPages` metadata.

### `GET /api/announcements`
- **Query Parameters**:
  - `page`: Page number (default `1`, integer >= 1)
  - `limit`: Items per page (default `10`, integer 1-100)
  - `category`: Filter by category (e.g. `event`, `urgent`)
  - `priority`: Filter by priority (e.g. `important`, `urgent`)
  - `search`: Filter by keyword in title or content
  - `status`: Default `published`. Admins can specify `status=all` or `status=draft`.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "id": 2,
        "title": "Spring Gala 2026: Early Bird Passes Now Available",
        "body": "Early bird tickets for Spring Gala 2026 are officially released.",
        "content": "Early bird tickets for Spring Gala 2026 are officially released.",
        "priority": "important",
        "category": "event",
        "status": "published",
        "published_at": "2026-09-19T09:00:00.000Z",
        "created_by": 1,
        "author_name": "Admin User",
        "author_role": "admin"
      }
    ],
    "page": 1,
    "limit": 10,
    "total": 6,
    "totalPages": 1
  }
  ```

### `GET /api/announcements/:id`
- **Parameters**: `id` (integer)
- **Description**: Returns announcement details. Unpublished drafts return `404` unless `?include_drafts=true` is provided.
- **Response `200 OK`**: Complete announcement detail.

### `POST /api/announcements`
- **Description**: Creates a new announcement bulletin (supports both `published` and `draft` status).
- **Body**:
  ```json
  {
    "title": "Hackathon Finalist Showcase",
    "content": "Join us this Saturday for final showcases!",
    "priority": "important",
    "category": "event",
    "status": "draft"
  }
  ```
- **Response `201 Created`**: Returns created record.

### `PATCH /api/announcements/:id/publish`
- **Description**: Publishes a draft announcement, setting `status = 'published'` and `published_at = NOW()`.
- **Response `200 OK`**: Returns updated published announcement.

---

## 5. Shared Backend Utilities

### `isActiveMember(userId, client)`
- **Path**: `backend/shared/membership/isActiveMember.js`
- **Contract**: Centralized active-member rule. Returns `true` if and only if:
  `status = 'active' AND dues_status = 'paid' AND expiry_date > NOW()`

### `getMembershipStatus(userId, client)`
- **Path**: `backend/shared/membership/getMembershipStatus.js`
- **Contract**: Returns status engine object: `{ status, startedAt, expiryDate, daysRemaining, isActive, expiryCategory }`.

### `syncMembershipStatuses(client)`
- **Path**: `backend/shared/membership/syncMembershipStatuses.js`
- **Contract**: Automatically and idempotently transitions expired memberships (`status = 'active' AND expiry_date <= NOW()`) to `'expired'`. Run on server startup and before membership-sensitive checks.

### `createTransaction(txData, client)`
- **Path**: `backend/shared/transactions/createTransaction.js`
- **Contract**: Safely inserts into `transactions` with idempotency constraint `UNIQUE(source_type, source_id)`.

---

## 6. Architecture & Security Decisions
1. **Parameterized Queries**: All queries utilize PostgreSQL `$1, $2` parameters to guarantee SQL injection prevention.
2. **Database Transactions**: Operations involving multi-step modifications (e.g. renewal, payment + transaction ledger) execute within `BEGIN ... COMMIT / ROLLBACK` transaction boundaries.
3. **No Redundant Columns**: `is_active` and `expiring_soon` are computed dynamically to maintain data normalization and eliminate status drift.
4. **Audit History**: Historical memberships are preserved with `renewed_from_membership_id` linking chains. Canceled records preserve their timestamps and cancellation reason.
5. **Draft Privacy**: Draft announcements are isolated from public listings and rejected by detail endpoints unless authorized.


# Student Organization System — API Documentation

This document provides complete documentation for the **Shared Foundation**, **Auth Module**, **Membership Module**, **Announcements Module**, and **Events Module**.

---

## 1. Shared Function Contracts (`backend/shared/`)

### A. Auth Contracts (`backend/shared/auth/`)

#### `getCurrentUser(req)`
* **Location**: `backend/shared/auth/getCurrentUser.js`
* **Input**: Express `req` object.
* **Output**: `{ id, name, email, role }` or `null`.
* **Behavior**: Checks `req.user` first (if set by middleware), then extracts and verifies Bearer JWT token from `Authorization: Bearer <token>` header using `env.JWT_SECRET`.

#### `requireAuth`
* **Location**: `backend/shared/auth/requireAuth.js`
* **Type**: Express Middleware.
* **Behavior**: Ensures the request is authenticated. Sets `req.user`.
* **Error**: Returns `401 Unauthorized` with `{ error: 'UNAUTHORIZED' }` if missing or invalid.

#### `requireRole(...roles)`
* **Location**: `backend/shared/auth/requireRole.js`
* **Type**: Express Middleware Factory.
* **Input**: Permitted roles (e.g., `'admin'`, `'event_manager'`, `'treasurer'`, `'volunteer'`).
* **Behavior**: Validates `req.user.role`.
* **Errors**:
  * `401 Unauthorized` `{ error: 'UNAUTHORIZED' }` if unauthenticated.
  * `403 Forbidden` `{ error: 'FORBIDDEN' }` if authenticated but role is not authorized.

---

### B. Membership Contracts (`backend/shared/membership/`)

#### `isActiveMember(userId, client = pool)`
* **Location**: `backend/shared/membership/isActiveMember.js`
* **Input**: `userId` (number), optional PostgreSQL transaction `client`.
* **Output**: `Promise<boolean>` (`true` or `false`).
* **Rule**: Returns `true` **only** if `dues_status = 'paid'` AND `expiry_date >= CURRENT_DATE`.

#### `getMembershipStatus(userId, client = pool)`
* **Location**: `backend/shared/membership/isActiveMember.js`
* **Input**: `userId` (number).
* **Output**: `Promise<{ status: 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'NONE', membership: object | null }>`.
* **Usage**: Provides badge status for door check-in, member passes, and ticket pricing.

---

### C. Financial Ledger Contracts (`backend/shared/transactions/`)

#### `createTransaction(params, client = pool)`
* **Location**: `backend/shared/transactions/createTransaction.js`
* **Input**:
  ```typescript
  {
    source_type: 'dues' | 'ticket' | 'merch' | 'fundraiser' | 'expense',
    source_id: number,
    user_id?: number | null,
    amount: number | string,
    direction: 'in' | 'out',
    payment_mode: 'cash' | 'online' | 'upi' | 'card',
    status?: 'paid' // default 'paid'
  }
  ```
* **Output**: `Promise<object>` (The created or existing transaction record).
* **Idempotency Guarantee**: Backed by PostgreSQL constraint `UNIQUE(source_type, source_id)`. Multiple calls for the same business action return the existing transaction without duplicating ledger entries.

---

### D. QR Code & Cryptographic Contracts (`backend/shared/qr/`)

#### `signTicketCode(ticketCode, secret = env.QR_SECRET)`
* **Location**: `backend/shared/qr/signTicketCode.js`
* **Input**: `ticketCode` (string).
* **Output**: 10-character hexadecimal string representing the first 10 hex characters of `HMAC_SHA256(ticket_code, QR_SECRET)`.

#### `generateQR(ticketCode, options = {})`
* **Location**: `backend/shared/qr/generateQR.js`
* **Input**: `ticketCode` (string).
* **Output**: `Promise<{ payload: string, qrDataUrl: string, signature: string, ticketCode: string }>`.
* **Format**: `payload` is strictly formatted as `<ticket_code>.<signature>`.

#### `verifyQR(payload)`
* **Location**: `backend/shared/qr/verifyQR.js`
* **Input**: `payload` (string in format `ticket_code.signature`).
* **Output**: `{ valid: boolean, error?: string, ticketCode?: string, signature?: string }`.
* **Security**: Uses constant-time comparison `crypto.timingSafeEqual` to prevent timing attacks. Does not access the database.

---

## 2. Authentication API (`/auth`)

### `POST /auth/register`
* **Description**: Register a new student account. Initializes a pending membership record automatically.
* **Auth**: None (Public).
* **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@ldce.edu",
    "password": "Password123"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "user": {
      "id": 9,
      "name": "Jane Doe",
      "email": "jane@ldce.edu",
      "role": "guest",
      "created_at": "..."
    },
    "token": "eyJhbGciOi..."
  }
  ```
* **Errors**: `400 INVALID_NAME`, `400 INVALID_EMAIL_FORMAT`, `400 WEAK_PASSWORD`, `409 EMAIL_ALREADY_EXISTS`.

---

### `POST /auth/login`
* **Description**: Authenticate with email and password to receive JWT token.
* **Auth**: None (Public).
* **Request Body**:
  ```json
  {
    "email": "jane@ldce.edu",
    "password": "Password123"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": 9,
      "name": "Jane Doe",
      "email": "jane@ldce.edu",
      "role": "guest",
      "created_at": "..."
    },
    "token": "eyJhbGciOi..."
  }
  ```
* **Errors**: `400 MISSING_CREDENTIALS`, `401 INVALID_CREDENTIALS`.

---

### `GET /auth/me`
* **Description**: Retrieve safe profile information for the authenticated user.
* **Auth**: Required (`requireAuth`).
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": 9,
      "name": "Jane Doe",
      "email": "jane@ldce.edu",
      "role": "guest",
      "created_at": "..."
    }
  }
  ```
* **Errors**: `401 UNAUTHORIZED`.

---

## 3. Membership API (`/membership` & `/members`)

### `GET /membership/me`
* **Description**: Retrieve current user's membership details and badge status (`ACTIVE`, `EXPIRED`, `PENDING`, `NONE`).
* **Auth**: Required (`requireAuth`).
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**:
  ```json
  {
    "status": "ACTIVE",
    "membership": {
      "id": 1,
      "member_code": "MEM-2026-MAYA",
      "dues_amount": "500.00",
      "dues_status": "paid",
      "start_date": "2026-01-01",
      "expiry_date": "2026-12-31",
      "paid_at": "..."
    }
  }
  ```

---

### `POST /membership/pay`
* **Description**: Pay annual membership dues. Transitions membership from `pending`/`expired` to `paid` with validity through Dec 31 of current year, upgrades role from `guest` to `member`, and creates one dues transaction in the financial ledger.
* **Auth**: Required (`requireAuth`).
* **Headers**: `Authorization: Bearer <token>`
* **Request Body** (optional):
  ```json
  {
    "payment_mode": "online"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "message": "Membership dues paid successfully",
    "membership": {
      "id": 3,
      "dues_status": "paid",
      "start_date": "2026-10-03",
      "expiry_date": "2026-12-31"
    },
    "transaction": {
      "id": 5,
      "source_type": "dues",
      "amount": "500.00",
      "direction": "in"
    },
    "status": "ACTIVE"
  }
  ```
* **Errors**: `400 MEMBERSHIP_ALREADY_ACTIVE` (if already active).

---

### `GET /membership/pass`
* **Description**: Retrieve digital member pass card details.
* **Auth**: Required (`requireAuth`).
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**:
  ```json
  {
    "pass": {
      "name": "Maya Member",
      "email": "maya@odoo-ldce.org",
      "member_code": "MEM-2026-MAYA",
      "status": "ACTIVE",
      "start_date": "2026-01-01",
      "expiry_date": "2026-12-31",
      "dues_amount": "500.00"
    }
  }
  ```

---

### `GET /membership/verify/:memberCode`
* **Description**: Public verification endpoint for physical or digital member cards.
* **Auth**: None (Public).
* **Response (200 OK)**:
  ```json
  {
    "valid": true,
    "status": "ACTIVE",
    "member_code": "MEM-2026-MAYA",
    "name": "Maya Member",
    "email": "maya@odoo-ldce.org",
    "start_date": "2026-01-01",
    "expiry_date": "2026-12-31"
  }
  ```
* **Errors**: `404 MEMBER_NOT_FOUND`.

---

### `GET /membership/expiring`
* **Description**: List memberships expiring within 60 days for renewal reminders.
* **Auth**: Required (`admin` or `treasurer`).
* **Response (200 OK)**:
  ```json
  {
    "expiring": [
      {
        "id": 2,
        "member_code": "MEM-2025-EDDIE",
        "user_name": "Eddie Expired",
        "expiry_date": "2025-12-31"
      }
    ]
  }
  ```
* **Errors**: `403 FORBIDDEN`.

---

### `GET /members`
* **Description**: Full membership roster.
* **Auth**: Required (`admin` or `treasurer`).
* **Response (200 OK)**:
  ```json
  {
    "members": [ ... ]
  }
  ```
* **Errors**: `403 FORBIDDEN`.

---

## 4. Announcements API (`/announcements`)

### `GET /announcements`
* **Description**: List all organization announcements in chronological order (newest first).
* **Auth**: None (Public).
* **Response (200 OK)**:
  ```json
  {
    "announcements": [
      {
        "id": 1,
        "title": "Welcome to the New Academic Year!",
        "body": "Welcome all students...",
        "created_at": "...",
        "author_name": "Admin User",
        "author_email": "admin@odoo-ldce.org"
      }
    ]
  }
  ```

---

### `POST /announcements`
* **Description**: Post a new announcement.
* **Auth**: Required (`admin` or `event_manager`).
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "title": "Hackathon Submission Deadline Extended",
    "body": "All teams have an additional 1 hour for the final submission checkpoint."
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "announcement": {
      "id": 3,
      "title": "Hackathon Submission Deadline Extended",
      "body": "...",
      "created_by": 1,
      "created_at": "..."
    }
  }
  ```
* **Errors**: `400 INVALID_TITLE`, `400 INVALID_BODY`, `401 UNAUTHORIZED`, `403 FORBIDDEN`.

---

## 5. Events Module API (`/events`, `/tickets`, `/checkin`)

### `POST /events`
* **Description**: Create a new event with seat capacity and tiered pricing.
* **Auth**: Required (`admin` or `event_manager`).
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "title": "Spring Gala 2026",
    "venue": "Main Auditorium",
    "starts_at": "2026-11-15T18:00:00Z",
    "capacity": 100,
    "member_price": 300.00,
    "non_member_price": 500.00
  }
  ```
* **Response (201 Created)**: Event object.
* **Errors**: `400 INVALID_EVENT_DATA`, `403 FORBIDDEN`.

---

### `GET /events`
* **Description**: List all events sorted by start date.
* **Auth**: None (Public).

---

### `GET /events/:id`
* **Description**: Get full details for a single event.
* **Auth**: None (Public).

---

### `GET /events/:id/stats`
* **Description**: Real-time event statistics: capacity, seats remaining, tickets sold, tickets checked in, revenue.
* **Auth**: Required (`admin`, `event_manager`, or `treasurer`).

---

### `POST /events/:id/tickets`
* **Description**: Check out a ticket. Automatically determines pricing via `isActiveMember(userId)`. **Does not decrement seats yet.**
* **Auth**: Required (`requireAuth`).

---

### `POST /tickets/:id/pay`
* **Description**: Atomically pays for a ticket. Locks the event row (`FOR UPDATE`), checks `seats_remaining > 0`, decrements seat count, updates ticket to `paid`, and registers exactly 1 transaction in the ledger.
* **Auth**: Required (`requireAuth`).
* **Errors**: `400 TICKET_ALREADY_PAID`, `403 FORBIDDEN`, `409 NO_SEATS_AVAILABLE`.

---

### `GET /tickets/mine`
* **Description**: Returns all tickets purchased by the authenticated user.
* **Auth**: Required (`requireAuth`).

---

### `GET /tickets/:id/qr`
* **Description**: Generates signed QR payload and base64 PNG data URL for a paid ticket.
* **Auth**: Required (`requireAuth`).

---

### `POST /checkin/scan`
* **Description**: Door check-in scanning endpoint. Recomputes HMAC signature, verifies payment, checks for duplicate scan atomically, and logs check-in staff.
* **Auth**: Required (`admin`, `event_manager`, or `volunteer`).
* **Response Values**: `VALID`, `ALREADY_USED`, `INVALID`. Expired members are admitted with `VALID` and display `member_status: EXPIRED`.

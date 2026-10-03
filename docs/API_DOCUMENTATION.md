# Student Organization System — API Documentation

This document covers the **Shared Backend Foundation** and the **Events + Tickets + QR + Door Check-in Module**.

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
* **Usage**: Provides badge status for door check-in and profiles.

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

## 2. Events Module API Endpoints (`/events`, `/tickets`, `/checkin`)

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
* **Response (201 Created)**:
  ```json
  {
    "event": {
      "id": 1,
      "title": "Spring Gala 2026",
      "venue": "Main Auditorium",
      "starts_at": "2026-11-15T18:00:00Z",
      "capacity": 100,
      "seats_remaining": 100,
      "member_price": "300.00",
      "non_member_price": "500.00",
      "created_at": "..."
    }
  }
  ```
* **Errors**: `400 INVALID_EVENT_DATA`, `400 INVALID_CAPACITY`, `400 INVALID_PRICE`, `401 UNAUTHORIZED`, `403 FORBIDDEN`.

---

### `GET /events`
* **Description**: List all events sorted by start date.
* **Auth**: None (Public).
* **Response (200 OK)**:
  ```json
  {
    "events": [
      {
        "id": 1,
        "title": "Spring Gala 2026",
        "venue": "Main Auditorium",
        "starts_at": "2026-11-15T18:00:00Z",
        "capacity": 100,
        "seats_remaining": 99,
        "member_price": "300.00",
        "non_member_price": "500.00"
      }
    ]
  }
  ```

---

### `GET /events/:id`
* **Description**: Get full details for a single event.
* **Auth**: None (Public).
* **Response (200 OK)**:
  ```json
  {
    "event": {
      "id": 1,
      "title": "Spring Gala 2026",
      "venue": "Main Auditorium",
      "starts_at": "2026-11-15T18:00:00Z",
      "capacity": 100,
      "seats_remaining": 99,
      "member_price": "300.00",
      "non_member_price": "500.00"
    }
  }
  ```
* **Errors**: `404 EVENT_NOT_FOUND`.

---

### `GET /events/:id/stats`
* **Description**: Real-time event attendance, seat remaining, and ticket sales revenue.
* **Auth**: Required (`admin`, `event_manager`, or `treasurer`).
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**:
  ```json
  {
    "stats": {
      "id": 1,
      "title": "Spring Gala 2026",
      "capacity": 100,
      "seats_remaining": 99,
      "tickets_sold": 1,
      "tickets_checked_in": 1,
      "ticket_revenue": 300.00
    }
  }
  ```
* **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 EVENT_NOT_FOUND`.

---

### `POST /events/:id/tickets`
* **Description**: Check out a ticket. Automatically determines pricing via `isActiveMember(userId)`. **Does not decrement seats yet.**
* **Auth**: Required (`requireAuth`).
* **Headers**: `Authorization: Bearer <token>`
* **Request Body** (optional):
  ```json
  {
    "checkout_session_id": "SES-1727932800"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "ticket": {
      "id": 10,
      "ticket_code": "TCK-1727932800-A1B2C3D4",
      "event_id": 1,
      "user_id": 5,
      "price": "300.00",
      "price_type": "member",
      "payment_status": "pending",
      "checkout_session_id": "SES-1727932800"
    }
  }
  ```
* **Errors**: `404 EVENT_NOT_FOUND`, `409 NO_SEATS_AVAILABLE`.

---

### `POST /tickets/:id/pay`
* **Description**: Atomically pays for a ticket. Locks the event row (`FOR UPDATE`), checks `seats_remaining > 0`, decrements seat count, updates ticket to `paid`, and registers exactly 1 transaction in the ledger.
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
    "message": "Payment successful",
    "ticket": {
      "id": 10,
      "ticket_code": "TCK-1727932800-A1B2C3D4",
      "event_id": 1,
      "user_id": 5,
      "price": "300.00",
      "price_type": "member",
      "payment_status": "paid"
    }
  }
  ```
* **Errors**:
  * `400 TICKET_ALREADY_PAID` (Duplicate payment attempt).
  * `403 FORBIDDEN` (Ticket owned by another user).
  * `404 TICKET_NOT_FOUND` / `EVENT_NOT_FOUND`.
  * `409 NO_SEATS_AVAILABLE` (Sold out / concurrent race condition loser).

---

### `GET /tickets/mine`
* **Description**: Returns all tickets purchased by the authenticated user.
* **Auth**: Required (`requireAuth`).
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**:
  ```json
  {
    "tickets": [
      {
        "id": 10,
        "ticket_code": "TCK-1727932800-A1B2C3D4",
        "event_id": 1,
        "event_title": "Spring Gala 2026",
        "event_venue": "Main Auditorium",
        "event_starts_at": "2026-11-15T18:00:00Z",
        "price": "300.00",
        "price_type": "member",
        "payment_status": "paid",
        "checked_in_at": null,
        "created_at": "..."
      }
    ]
  }
  ```

---

### `GET /tickets/:id/qr`
* **Description**: Generates signed QR payload and base64 PNG data URL for a paid ticket.
* **Auth**: Required (`requireAuth`).
* **Headers**: `Authorization: Bearer <token>`
* **Response (200 OK)**:
  ```json
  {
    "ticket": {
      "id": 10,
      "ticket_code": "TCK-1727932800-A1B2C3D4",
      "payment_status": "paid"
    },
    "qr": {
      "payload": "TCK-1727932800-A1B2C3D4.7a3f89e1b2",
      "qrDataUrl": "data:image/png;base64,iVBORw0KGgo...",
      "signature": "7a3f89e1b2",
      "ticketCode": "TCK-1727932800-A1B2C3D4"
    }
  }
  ```
* **Errors**: `400 TICKET_NOT_PAID`, `403 FORBIDDEN`, `404 TICKET_NOT_FOUND`.

---

### `POST /checkin/scan`
* **Description**: Door check-in scanning endpoint. Recomputes HMAC signature, verifies payment, checks for duplicate scan atomically, and logs check-in staff.
* **Auth**: Required (`admin`, `event_manager`, or `volunteer`).
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "payload": "TCK-1727932800-A1B2C3D4.7a3f89e1b2"
  }
  ```
* **Response Variations (200 OK)**:
  * **Success (`VALID`)**:
    ```json
    {
      "result": "VALID",
      "message": "Check-in successful",
      "ticket_code": "TCK-1727932800-A1B2C3D4",
      "checked_in_at": "2026-10-03T10:58:35.000Z",
      "checked_in_by": 4,
      "holder": {
        "id": 5,
        "name": "Maya Member",
        "email": "maya@odoo-ldce.org"
      },
      "event": {
        "id": 1,
        "title": "Spring Gala 2026",
        "venue": "Main Auditorium"
      },
      "member_status": "ACTIVE"
    }
    ```
  * **Duplicate Scan (`ALREADY_USED`)**:
    ```json
    {
      "result": "ALREADY_USED",
      "message": "Ticket has already been checked in",
      "ticket_code": "TCK-1727932800-A1B2C3D4",
      "checked_in_at": "2026-10-03T10:58:35.000Z",
      "holder": { ... },
      "member_status": "ACTIVE"
    }
    ```
  * **Tampered or Unknown QR (`INVALID`)**:
    ```json
    {
      "result": "INVALID",
      "error": "INVALID_SIGNATURE",
      "message": "QR signature mismatch or tampered payload"
    }
    ```
  * **Expired Member Admission Rule**:
    If an expired member bought a valid ticket, it returns `result: "VALID"` and explicitly indicates `"member_status": "EXPIRED"`.

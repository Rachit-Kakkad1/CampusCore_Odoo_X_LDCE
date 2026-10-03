# API Documentation — Skyline Student Organization System

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

### `GET /api/membership/me`
- **Auth**: Bearer `<token>` (`requireAuth`)
- **Description**: Retrieves current user's membership details, dues status, and active validation.
- **Response**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "exists": true,
        "is_active": true,
        "computed_status": "active",
        "membership": {
          "id": 1,
          "user_id": 5,
          "member_code": "MEM-2026-MAYA",
          "dues_amount": "500.00",
          "dues_status": "paid",
          "start_date": "2026-01-01",
          "expiry_date": "2027-12-31",
          "paid_at": "2026-01-01T10:00:00.000Z",
          "is_active": true,
          "computed_status": "active"
        }
      }
    }
    ```

### `POST /api/membership`
- **Auth**: Bearer `<token>` (`requireAuth`)
- **Description**: Initiates a new membership record for the caller in `pending` dues status.
- **Responses**:
  - `201 Created`: Membership created with `dues_status: 'pending'`, `dues_amount: 500.00`
  - `409 Conflict`: Membership already exists for this user

### `POST /api/membership/dues/pay`
- **Auth**: Bearer `<token>` (`requireAuth`)
- **Description**: Simulates dues payment (`online`, `upi`, `card`, `cash`), sets `dues_status = 'paid'`, assigns end-of-year expiry (`YYYY-12-31`), and creates an atomic transaction entry in `transactions` (`source_type = 'dues'`, `direction = 'in'`, `status = 'paid'`).
- **Request Body**:
  ```json
  {
    "payment_mode": "online"
  }
  ```
- **Response**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Membership dues paid successfully. Membership is now active.",
      "data": {
        "id": 1,
        "user_id": 10,
        "member_code": "MEM-2026-10",
        "dues_amount": "500.00",
        "dues_status": "paid",
        "start_date": "2026-10-03",
        "expiry_date": "2026-12-31",
        "is_active": true,
        "computed_status": "active"
      }
    }
    ```

### `GET /api/membership/pass`
- **Auth**: Bearer `<token>` (`requireAuth`)
- **Description**: Returns safe digital membership card verification data.
- **Response**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "membership_id": 1,
        "member_code": "MEM-2026-10",
        "member_name": "Jane Doe",
        "user_email": "jane@ldce.ac.in",
        "role": "member",
        "dues_status": "paid",
        "dues_amount": "500.00",
        "start_date": "2026-10-03",
        "expiry_date": "2026-12-31",
        "is_active": true,
        "computed_status": "active"
      }
    }
    ```
  - `404 Not Found`: No membership record exists for this user

### `GET /api/membership/all`
- **Auth**: Bearer `<token>` (`requireAuth` + `requireRole('admin', 'treasurer')`)
- **Description**: Admin and Treasurer oversight endpoint returning all registered memberships.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "count": 3,
      "data": [ ... ]
    }
    ```
  - `403 Forbidden`: Authenticated user does not have `admin` or `treasurer` role

---

## 4. Announcements Module (`/api/announcements`) — *Owner: Nishit*

### `GET /api/announcements`
- **Auth**: Public
- **Description**: Returns all announcement bulletins in reverse chronological order (newest first), with author details.
- **Response**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "count": 2,
      "data": [
        {
          "id": 2,
          "title": "Spring Gala Registration Open",
          "body": "Early bird tickets are now live for the annual Spring Gala flagship event!",
          "created_by": 3,
          "created_at": "2026-10-03T05:00:00.000Z",
          "author_name": "Ethan Events",
          "author_role": "event_manager"
        },
        {
          "id": 1,
          "title": "Welcome to Skyline Student Organization!",
          "body": "Welcome everyone to the new semester! Check out upcoming events and official club merchandise.",
          "created_by": 1,
          "created_at": "2026-10-01T04:00:00.000Z",
          "author_name": "Admin User",
          "author_role": "admin"
        }
      ]
    }
    ```

### `GET /api/announcements/:id`
- **Auth**: Public
- **Description**: Returns details for a single announcement by its numeric ID.
- **Parameters**: `id` (integer in URL path)
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "title": "Welcome to Skyline Student Organization!",
        "body": "Welcome everyone to the new semester! Check out upcoming events and official club merchandise.",
        "created_by": 1,
        "created_at": "2026-10-01T04:00:00.000Z",
        "author_name": "Admin User",
        "author_role": "admin"
      }
    }
    ```
  - `400 Bad Request`: `{"error": {"message": "Invalid announcement ID.", "status": 400}}`
  - `404 Not Found`: `{"error": {"message": "Announcement with ID 999 not found.", "status": 404}}`

### `POST /api/announcements`
- **Auth**: Public (Development fallback: uses User 1 or `x-user-id` header until auth is wired)
- **Description**: Publishes a new announcement bulletin to the organization feed.
- **Request Body**:
  ```json
  {
    "title": "Executive Board Election Results",
    "body": "Congratulations to our newly elected student representatives for the upcoming academic year!"
  }
  ```
  *(Note: `content` is also accepted as an alias for `body`)*
- **Responses**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "Announcement created successfully",
      "data": {
        "id": 3,
        "title": "Executive Board Election Results",
        "body": "Congratulations to our newly elected student representatives for the upcoming academic year!",
        "created_by": 1,
        "created_at": "2026-10-03T12:00:00.000Z",
        "author_name": "Admin User",
        "author_role": "admin"
      }
    }
    ```
  - `400 Bad Request`: Missing title, title > 255 chars, or missing body

---

## 5. Shared Backend Utilities

### `isActiveMember(userId)`
- **Path**: `backend/shared/membership/isActiveMember.js`
- **Contract**:
  ```javascript
  const { isActiveMember } = require('../../shared/membership/isActiveMember');
  const active = await isActiveMember(userId); // returns boolean
  ```
- **Rule**:
  `dues_status === 'paid' AND expiry_date >= CURRENT_DATE`

### `requireAuth`
- **Path**: `backend/shared/auth/requireAuth.js`
- **Usage**: Express route middleware verifying `Authorization: Bearer <token>` and attaching `req.user`.

### `requireRole(...allowedRoles)`
- **Path**: `backend/shared/auth/requireRole.js`
- **Usage**: Express route middleware verifying `req.user.role`.

### `createTransaction(txData, client)`
- **Path**: `backend/shared/transactions/createTransaction.js`
- **Usage**: Records financial ledger records into PostgreSQL `transactions` table with idempotency constraint `UNIQUE(source_type, source_id)`.

---

## 6. Upcoming Modules (Planned)
- **Events & Ticketing (`/api/events`, `/api/tickets`)** — Rachit
- **Merchandise & Orders (`/api/products`, `/api/orders`)** — Harshit
- **Finance, Fundraisers, Expenses (`/api/finance`, `/api/fundraisers`, `/api/tasks`, `/api/expenses`)** — Tapan

# Student Organization System

> **Corrected Build Specification & AI Coding Agent README**  
> **24-Hour Hackathon — Odoo × LDCE**  
> *Implementation-ready specification derived from the Hackathon requirements with transaction and reservation concurrency issues corrected.*

---

## 1. Scope & MVP

Build only what the problem statement requires. The six MVP scenes are:

| Scene | MVP Must Work |
| :--- | :--- |
| **New student joins** | Sign-up, dues pending → paid, `ACTIVE`/`EXPIRED` membership, year-end expiry (Dec 31 of current year), member discounts, renewal reminder list, member pass. |
| **Spring Gala tickets** | Seat limit, member/non-member price, seats left, online purchase, QR ticket, door check-in (`valid` / `already_used` / `invalid`), membership status display, attendance, ticket revenue. |
| **Announcements** | Admin posts once; public/member view; history with date/time. |
| **Hoodies / Merch** | Hoodies/T-shirts, stock per size, order size + quantity, payment pending → paid, member-only discount, stock update, order history. |
| **Fundraiser** | Fundraiser campaigns, tasks with assignee/status, progress percentage, money raised recorded as income. |
| **Treasurer** | Income by source, reimbursed expenses, balance, who still owes; expense submission, receipt, approval and reimbursement. |

### Out of Scope
* Offline mode / offline QR validation
* Email mailing list (stretch)
* Refunds and cancellations
* Event profit calculation
* Advanced analytics & AI features
* Separate administrative dashboards or per-role siloed dashboards
* Real external payment gateways (payment is simulated via a unified `Pay` action)
* Blog / CMS features

---

## 2. Tech Stack & Repository Architecture

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React + Vite, React Router, Tailwind CSS |
| **Backend** | Node.js + Express, JWT Bearer auth, bcrypt |
| **Database** | PostgreSQL (Supabase / plain SQL migrations via `pg`) |
| **QR Code** | `qrcode` (generation) + `html5-qrcode` (camera scanner) + manual code-entry fallback |
| **Money / Currency**| INR (`₹`), stored as `NUMERIC(10,2)` |

### Module Ownership & Structure
* `/shared` → Nishit *(Shared contracts, database client, auth middleware)*
* `auth` / `membership` / `announcements` → Nishit
* `events` / `tickets` / `check-in` → Rachit
* `merchandise` / `shop` → Harshit
* `finance` / `expenses` / `fundraisers` → Tapan

Frontend mirrors the backend module structure.

---

## 3. Roles & Permissions

| Role | Access Level |
| :--- | :--- |
| `admin` | Full organization management and configuration |
| `treasurer` | Finance overview, expense approval and reimbursement |
| `event_manager` | Event management and door check-in |
| `volunteer` | Assigned tasks, expense submission, door check-in |
| `member` | Member pass, tickets, merchandise, announcements |
| `guest` | Public pages and non-member ticket purchase |

> **CRITICAL RULE**: Role is **not** active membership. Pricing and discounts must always verify `isActiveMember(userId)`.

---

## 4. Shared Contracts

### Helper Signatures
* `getCurrentUser(req) -> { id, name, email, role }`
* `requireAuth`, `requireRole(...roles)`
* `isActiveMember(userId) -> boolean`  
  * Returns `true` **only** when `dues_status = 'paid'` AND `expiry_date >= CURRENT_DATE`.
* `createTransaction({ source_type, source_id, user_id, amount, direction, payment_mode, status })`

### Transaction Rules
* `source_type`: `'dues'` | `'ticket'` | `'merch'` | `'fundraiser'` | `'expense'`
* `direction`: `'in'` | `'out'`
* `payment_mode`: `'cash'` | `'online'` | `'upi'` | `'card'`
* **Transaction Creation**: MVP transaction rows are created **only when money moves**; created transaction rows use `status = 'paid'`.
* **Idempotency**: `createTransaction` is idempotent via database constraint `UNIQUE(source_type, source_id)`.
* **Fundraiser Incomes**: For fundraisers, `source_id = fundraiser_income.id` (not `fundraiser_id`), so multiple income entries can be recorded for a single fundraiser.

---

## 5. Payment & Reservation Flows

### A. Tickets (No Reservation on Checkout)
```
Checkout → Pay → BEGIN TRANSACTION → Check Seats Remaining → Decrement Seat → Create PAID Ticket → Create Transaction → COMMIT
```
> *Do not reserve a seat merely because a pending checkout exists.* This prevents abandoned pending tickets from permanently consuming capacity.

### B. Merchandise Orders (No Stock Reduction on Pending)
```
Create Pending Order (stock unchanged) → Pay → BEGIN TRANSACTION → Check Stock → Decrement Stock → Mark Order PAID → Create Transaction → COMMIT
```

### C. Who Still Owes Formula
$$\text{Who Still Owes} = \text{Pending Dues} + \text{Pending Orders}$$
*(Pending tickets are excluded because seats are not held until payment).*

---

## 6. Database Core Schema

```sql
-- Users
users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'guest'
);

-- Memberships
memberships (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  member_code VARCHAR(50) UNIQUE NOT NULL,
  dues_amount NUMERIC(10,2) NOT NULL DEFAULT 500.00,
  dues_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid'
  start_date DATE,
  expiry_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Announcements
announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events
events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  venue VARCHAR(255) NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  capacity INT NOT NULL,
  seats_remaining INT NOT NULL,
  member_price NUMERIC(10,2) NOT NULL,
  non_member_price NUMERIC(10,2) NOT NULL
);

-- Tickets
tickets (
  id SERIAL PRIMARY KEY,
  ticket_code VARCHAR(64) UNIQUE NOT NULL,
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  price NUMERIC(10,2) NOT NULL,
  price_type VARCHAR(20) NOT NULL, -- 'member', 'non_member'
  payment_status VARCHAR(20) NOT NULL, -- 'pending', 'paid'
  checkout_session_id VARCHAR(100) UNIQUE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by INT REFERENCES users(id)
);

-- Products & Product Sizes
products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT
);

product_sizes (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(20) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  UNIQUE(product_id, size)
);

-- Orders & Order Items
orders (
  id SERIAL PRIMARY KEY,
  order_code VARCHAR(64) UNIQUE NOT NULL,
  user_id INT REFERENCES users(id),
  checkout_session_id VARCHAR(100) UNIQUE,
  subtotal NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total NUMERIC(10,2) NOT NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' -- 'pending', 'paid'
);

order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  product_size_id INT REFERENCES product_sizes(id),
  quantity INT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);

-- Fundraisers, Tasks & Fundraiser Income
fundraisers (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INT REFERENCES users(id)
);

tasks (
  id SERIAL PRIMARY KEY,
  fundraiser_id INT REFERENCES fundraisers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  assignee_id INT REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'todo' -- 'todo', 'in_progress', 'completed'
);

fundraiser_income (
  id SERIAL PRIMARY KEY,
  fundraiser_id INT REFERENCES fundraisers(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  note TEXT,
  recorded_by INT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses
expenses (
  id SERIAL PRIMARY KEY,
  submitted_by INT REFERENCES users(id),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'reimbursed'
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  reimbursed_by INT REFERENCES users(id),
  reimbursed_at TIMESTAMP WITH TIME ZONE
);

-- Transactions
transactions (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL, -- 'dues', 'ticket', 'merch', 'fundraiser', 'expense'
  source_id INT NOT NULL,
  user_id INT REFERENCES users(id),
  amount NUMERIC(10,2) NOT NULL,
  direction VARCHAR(10) NOT NULL, -- 'in', 'out'
  payment_mode VARCHAR(20) NOT NULL, -- 'cash', 'online', 'upi', 'card'
  status VARCHAR(20) NOT NULL DEFAULT 'paid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_type, source_id)
);
```

---

## 7. Business Rules

1. **Dues**: `register` → `pending membership` → `Pay` → `paid` + `start today` + `expiry Dec 31 current year` + `role member` + exactly one dues transaction.
2. **Member Status**: Derived dynamically: `PENDING`, `ACTIVE`, `EXPIRED`.
3. **Ticket Pricing**: Fixed at time of purchase using `isActiveMember`. Later membership expiration never retroactively changes ticket price.
4. **Merchandise Discount**: Applies only when `isActiveMember` is true at order creation.
5. **Atomic Seat Decrement**: Seats decrement atomically at successful ticket payment.
6. **Atomic Stock Decrement**: Stock decrements atomically at successful order payment.
7. **Idempotent Checkout**: `checkout_session_id` prevents duplicate checkouts.
8. **One Transaction Per Movement**: Paid ticket, order, or dues creates exactly one transaction row.
9. **Single-Use Check-in**: Door check-in is atomic and one-time. A second scan returns `already_used`.
10. **Expired Member Check-in**: An expired member’s valid ticket still checks in successfully and displays `Member: EXPIRED`.
11. **Expense Transitions**: `pending` → `approved`/`rejected` → `reimbursed`. Only `reimbursed` creates an outgoing transaction.
12. **Fundraiser Income**: Records a `fundraiser_income` row and exactly one incoming transaction with `source_id = fundraiser_income.id`.
13. **Who Still Owes**: Calculated as `pending dues + pending orders`.
14. **Simulated Payment**: Payment is simulated and immediately succeeds when `Pay` is triggered.
15. **Server-Side Authorization**: Enforced on all routes; unauthorized requests strictly return HTTP `403`.
16. **Fundraiser Progress**: If a fundraiser has 0 tasks, progress is `0%`. Otherwise: `(completed_tasks / total_tasks) * 100`.

---

## 8. Key Endpoints & Module API

### Auth, Membership & Announcements (Nishit)
* `POST /auth/register` — Register new user
* `POST /auth/login` — Login with credentials and receive JWT
* `GET /auth/me` — Current user profile & roles
* `POST /membership` — Initialize membership dues request
* `POST /membership/pay` — Pay annual dues (activates membership to Dec 31)
* `GET /membership/me` — Current membership status & details
* `GET /membership/pass` — Digital member pass
* `GET /membership/verify/:memberCode` — Verify membership status
* `GET /membership/expiring` — List of memberships needing renewal
* `GET /members` — Admin member roster
* `GET /announcements` — List announcements (public / member view)
* `POST /announcements` — Admin post new announcement

### Events, Tickets & Check-in (Rachit)
* `GET /events` — List upcoming events with available seats
* `GET /events/:id` — Event details
* `POST /events` — Create event (Admin / Event Manager)
* `POST /events/:id/tickets` — Checkout ticket
* `POST /tickets/:id/pay` — Pay & atomically decrement seats
* `GET /tickets/mine` — My purchased tickets
* `GET /tickets/:id/qr` — Get QR code payload & image
* `POST /checkin/scan` — Door check-in verification (camera or manual code)
* `GET /events/:id/stats` — Attendance & ticket revenue statistics

### Merchandise & Shop (Harshit)
* `GET /products` — Product catalog with sizes and real-time stock
* `GET /products/:id` — Product details
* `POST /products` — Admin add / update products
* `POST /orders` — Create pending order with cart items
* `POST /orders/:id/pay` — Pay & atomically decrement stock
* `GET /orders/mine` — User's order history
* `GET /orders` — Admin order management

### Finance, Expenses & Fundraisers (Tapan)
* `GET /finance/summary` — Overview: total income, total expense, balance
* `GET /finance/transactions` — Ledger of all transactions
* `GET /finance/owing` — List of users with pending dues or orders
* `POST /finance/fundraiser-income` — Record incoming fundraiser donation/income
* `GET /expenses` — List submitted expenses
* `POST /expenses` — Submit expense receipt
* `PUT /expenses/:id/approve` — Treasurer approve/reject expense
* `POST /expenses/:id/reimburse` — Reimburse approved expense (creates transaction)
* `GET /fundraisers` — List active fundraisers & progress %
* `GET /fundraisers/:id` — Fundraiser details
* `POST /fundraisers` — Create new fundraiser
* `POST /fundraisers/:id/tasks` — Add task to fundraiser
* `PATCH /tasks/:id/status` — Update task status (`todo`, `in_progress`, `completed`)

---

## 9. QR Code Contract

* **QR Payload Format**: `<ticket_code>.<signature>`
* **Signature Algorithm**: First 10 hexadecimal characters of `HMAC_SHA256(ticket_code, QR_SECRET)`
* **Check-in Responses**:
  * `valid` — First-time scan; displays holder info, event, and active/expired membership tag.
  * `already_used` — Scanned previously; displays timestamp of first scan.
  * `invalid` — Signature mismatch, tampered code, or ticket not found.

---

## 10. Seed Data

### Users & Default Credentials
| User Name | Role | State / Condition |
| :--- | :--- | :--- |
| **Admin User** | `admin` | Full organization access |
| **Tara Treasurer** | `treasurer` | Finance & expense reimbursement access |
| **Ethan Events** | `event_manager`| Event creation & door check-in |
| **Vik Volunteer** | `volunteer` | Assigned tasks, expense submission, check-in |
| **Maya Member** | `member` | Active membership (`ACTIVE`) |
| **Eddie Expired** | `member` | Expired membership (`EXPIRED`) |
| **Greg Guest** | `guest` | No membership (sees non-member pricing) |
| **Pia Pending** | `guest` | Dues pending |

### Seed Entities
* **Spring Gala**: Capacity = 100, Seats Remaining = 100
* **Mini Workshop**: Capacity = 2 (for race-condition & oversell tests)
* **Club Hoodie**: ₹1,200 (Size L stock = 1 for oversell testing)
* **Club T-Shirt**: ₹600
* **Bake Sale Fundraiser**: 3 tasks seeded
* **Announcements**: 2 initial announcements

---

## 11. Acceptance Checklist

- [ ] **Sign-up + Paid Dues**: Transition to `ACTIVE`; before payment, user is `PENDING` without member discounts.
- [ ] **Renewal Reminder**: Expiring memberships appear in renewal reminder list.
- [ ] **Member Pass & Door Check-in**: Displays correct `ACTIVE` or `EXPIRED` status.
- [ ] **Expired Pricing**: Expired membership receives non-member ticket and merchandise prices.
- [ ] **Ticket Pricing Persistence**: Member / non-member ticket price remains fixed on the ticket once issued.
- [ ] **Last Seat Atomicity**: Last seat cannot be bought twice under concurrent requests.
- [ ] **QR Code Verification**: Correctly handles `valid`, `already_used`, and tampered/unknown as `invalid`.
- [ ] **Expired Member Admission**: Valid ticket for an expired member still admits with `Member: EXPIRED` displayed.
- [ ] **Audit Match**: Attendance count and ticket revenue match paid tickets and check-in logs.
- [ ] **Transaction Consistency**: Paid ticket creates exactly one transaction; pending ticket creates none.
- [ ] **Announcements Feed**: Posts appear with accurate author and timestamps.
- [ ] **Size Stock Isolation**: Hoodie purchase decrements only the selected size stock and applies member discount.
- [ ] **Guest Pricing**: Non-members never receive member discounts.
- [ ] **Idempotent Checkout**: Duplicate checkout triggers do not produce duplicate tickets/orders or double-decrement inventory.
- [ ] **Fundraiser Progress & Income**: Tasks update progress percentage; income records an incoming transaction.
- [ ] **Expense Life-cycle**: Submit → approve → reimburse; rejected or pending expenses never enter the ledger.
- [ ] **Finance Ledger**: Balance strictly equals $\sum \text{Income} - \sum \text{Expenses}$.
- [ ] **Who-Still-Owes**: Pending dues and orders appear in the list and immediately clear once paid.
- [ ] **Access Security**: Unauthorized endpoint access returns HTTP `403 Forbidden`.
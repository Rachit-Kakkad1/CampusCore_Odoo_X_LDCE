# API Documentation — Skyline Student Organization System

This document outlines the agreed API route structure and naming conventions for the 24-hour Odoo × LDCE Hackathon.

All endpoints are served under the unified `/api` prefix.

---

## 1. System Health
- `GET /api/health` — Central health check endpoint (returns `{"status": "ok"}`)

---

## 2. Team Module Boundaries & Prefixes

### Auth Module (`/api/auth`) — *Owner: Nishit*
- `/api/auth/register` — User registration (default: guest)
- `/api/auth/login` — Authentication and JWT token issuance
- `/api/auth/me` — Current authenticated user profile and roles

### Membership Module (`/api/membership`) — *Owner: Nishit*
- `/api/membership` — Retrieve user membership status & dues details
- `/api/membership/dues/pay` — Pay annual membership dues (atomic transaction)
- `/api/membership/pass` — View verified digital membership pass

### Announcements Module (`/api/announcements`) — *Owner: Nishit*
- `/api/announcements` — List all organization announcements
- `/api/announcements` — Create announcement (Admin / Event Manager / Treasurer)
- `/api/announcements/:id` — Announcement details

### Events & Ticketing Module (`/api/events`, `/api/tickets`) — *Owner: Rachit*
- `/api/events` — List upcoming events with seat availability and tiered pricing
- `/api/events/:id` — Event details
- `/api/events` — Create event (Admin / Event Manager)
- `/api/tickets` — User purchased tickets
- `/api/tickets/purchase` — Initiate ticket checkout & session
- `/api/tickets/:id/qr` — Generate / view signed ticket QR code
- `/api/tickets/checkin` — QR check-in scanner verification

### Merchandise & Shop Module (`/api/products`, `/api/orders`) — *Owner: Harshit*
- `/api/products` — Product catalog with sizes, pricing, and stock levels
- `/api/products/:id` — Product details
- `/api/orders` — View user order history
- `/api/orders/checkout` — Create order & process checkout (atomic stock deduction upon payment)

### Finance & Fundraisers Module (`/api/finance`, `/api/fundraisers`, `/api/tasks`, `/api/expenses`) — *Owner: Tapan*
- `/api/fundraisers` — List active club fundraising campaigns
- `/api/fundraisers/:id` — Fundraiser details with progress vs goal
- `/api/fundraisers/:id/income` — Record fundraiser income (`source_type = 'fundraiser'`, `source_id = fundraiser_income.id`)
- `/api/tasks` — List volunteer tasks for fundraisers (`TODO`, `IN_PROGRESS`, `COMPLETED`)
- `/api/tasks/:id/status` — Update task status
- `/api/expenses` — List submitted expenses
- `/api/expenses/submit` — Submit expense with receipt
- `/api/expenses/:id/approve` — Approve expense
- `/api/expenses/:id/reimburse` — Reimburse expense
- `/api/finance/transactions` — Organization-wide financial ledger (dues, tickets, merch, fundraisers, expenses)

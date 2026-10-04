<div align="center">

<p align="center">
  <img src="docs/assets/banner.svg" alt="CampusCore OS Banner" width="100%" />
</p>

# 🏛️ CampusCore OS
### The Autonomous Institutional Operating System for Student Organizations
**Engineered with Precision for the Odoo × LDCE 24-Hour Hackathon 2026**

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Platform-Node.js_v20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" /></a>
  <a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/Database-PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/Frontend-React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Build-Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Styling-Tailwind_CSS_3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS" /></a>
</p>
<p align="center">
  <a href="backend/tests/"><img src="https://img.shields.io/badge/Test_Suite-10%2F10_Passing_(100%25)-10B981?style=for-the-badge&logo=jest&logoColor=white" alt="Tests 100% Passing" /></a>
  <a href="backend/shared/qr/"><img src="https://img.shields.io/badge/Cipher-HMAC--SHA256-8B5CF6?style=for-the-badge&logo=auth0&logoColor=white" alt="HMAC SHA256" /></a>
  <a href="backend/db/seed_mega.js"><img src="https://img.shields.io/badge/Production_Seed-17%2C000%2B_Records-F59E0B?style=for-the-badge&logo=databricks&logoColor=white" alt="17,000+ Records" /></a>
  <a href="backend/modules/tickets/ticket.service.js"><img src="https://img.shields.io/badge/Concurrency-Zero_Race_(FOR_UPDATE)-EF4444?style=for-the-badge&logo=speedtest&logoColor=white" alt="Zero-Race Concurrency" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-EC4899?style=for-the-badge" alt="License" /></a>
</p>

<br/>

<p align="center">
  <b>A unified, production-grade enterprise platform engineered to eliminate paper sign-ups, disjointed payment links, and spreadsheet chaos. Features atomic seat reservation locks, cryptographic door check-in scanners, matrix apparel inventory, dual-stream crowdfunding, and double-entry treasury governance.</b>
</p>

<p align="center">
  <a href="#-quickstart--local-setup"><b>⚡ Quickstart</b></a> •
  <a href="#-system-architecture--engineering-contracts"><b>🏗️ Architecture</b></a> •
  <a href="#-feature-showcase"><b>✨ Features</b></a> •
  <a href="#-database-schema--mega-dataset"><b>📊 Database (17k+ Rows)</b></a> •
  <a href="#-test-suite--audit-results"><b>🧪 Test Matrix (100%)</b></a> •
  <a href="#-api-reference"><b>📡 API Docs</b></a> •
  <a href="#-role-based-access-matrix"><b>👥 RBAC Matrix</b></a>
</p>

---

</div>

## 📑 Table of Contents

- [🌟 Executive Summary](#-executive-summary)
- [🏗️ System Architecture & Engineering Contracts](#️-system-architecture--engineering-contracts)
  - [Zero-Race Concurrency & Ledger Pipeline Visual](#zero-race-concurrency--ledger-pipeline-visual)
  - [Full Component Architecture (Mermaid)](#full-component-architecture-mermaid)
  - [Layer Responsibilities](#layer-responsibilities)
- [✨ Feature Showcase](#-feature-showcase)
  - [1. 🛡️ Authentication, Security Center & Session Control](#1-️-authentication-security-center--session-control)
  - [2. 💳 Membership Lifecycle & Digital Passes](#2--membership-lifecycle--digital-passes)
  - [3. 🎟️ Event Ticketing & Zero-Race Engine](#3-️-event-ticketing--zero-race-engine)
  - [4. 👕 Merchandise Shop & Size Inventory Matrix](#4--merchandise-shop--size-inventory-matrix)
  - [5. 💖 Crowdfunding & Multi-Stream Fundraisers](#5--crowdfunding--multi-stream-fundraisers)
  - [6. ⚖️ Treasurer Double-Entry Ledger & Governance](#6-️-treasurer-double-entry-ledger--governance)
  - [7. 📋 Volunteer Operations & Task Dispatch](#7--volunteer-operations--task-dispatch)
  - [8. 📢 Broadcast Communications & Announcements](#8--broadcast-communications--announcements)
- [⚡ Production Pagination Engine](#-production-pagination-engine)
- [📊 Database Schema & Mega Dataset (17,000+ Records)](#-database-schema--mega-dataset-17000-records)
  - [Sequence Safety Guarantee](#sequence-safety-guarantee)
- [🧪 Test Suite & Audit Results](#-test-suite--audit-results)
- [🚀 Quickstart & Local Setup](#-quickstart--local-setup)
- [👥 Default Demo Credentials](#-default-demo-credentials)
- [📡 API Reference](#-api-reference)
- [👥 Role-Based Access Matrix](#-role-based-access-matrix)
- [📜 Team & Hackathon Credits](#-team--hackathon-credits)

---

## 🌟 Executive Summary

Campus organizations frequently struggle with fragmented operational silos: Google Forms for event RSVPs, WhatsApp groups for announcements, cash boxes for merchandise, and unverified UPI screenshots for dues. 

**CampusCore OS** replaces this fragmentation with an institutional-grade, single-source-of-truth web ecosystem:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CAMPUSCORE OS ECOSYSTEM                                   │
├─────────────────────┬─────────────────────┬─────────────────────┬──────────────────────┤
│   MEMBERSHIP PASS   │   EVENT TICKETING   │    MERCH APPAREL    │  COMMUNITY DONATION  │
│   Instant QR Card   │  Concurrent Locks   │  Size Stock Matrix  │  Dual-Stream Ledger  │
│   Auto-Dec 31 Exp   │  Door Scan & Code   │  Atomic Deductions  │  Anonymous Masking   │
├─────────────────────┴─────────────────────┴─────────────────────┴──────────────────────┤
│                         FINANCIAL TREASURY & AUDIT LEDGER                              │
│           Single-Inflow Ledger • Expense Approvals • Unpaid Dues Tracking              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 💎 Key Engineering Guarantees
- 🔒 **Zero Overselling Guarantee**: Strict row-level locking (`SELECT ... FOR UPDATE`) guarantees zero overselling on events and merchandise, even under concurrent burst checkouts.
- 🎟️ **Tamper-Proof Admission**: Event passes and member credentials utilize signed `HMAC-SHA256` tokens with real-time camera scanner support and human-readable door code fallbacks (`FB-XXXXXX`).
- 💰 **Audit-Safe Financial Ledger**: All monetary movements generate immutable ledger rows (`transactions`) enforced by database uniqueness `UNIQUE(source_type, source_id)`.
- 📦 **Pre-Loaded with 17,000+ Records**: Stress-tested and verified under realistic production load with 1,000 users, 1,000 events, 1,000 tickets, 1,000 orders, 1,000 fundraisers, 2,000 active donations, and 1,000 expenses.
- ⚡ **Sub-20ms Indexed Pagination**: Backed by composite B-Tree database indexes and dynamic page windowing for frictionless navigation across tens of thousands of rows.

---

## 🏗️ System Architecture & Engineering Contracts

### Zero-Race Concurrency & Ledger Pipeline Visual

<p align="center">
  <img src="docs/assets/architecture_flow.svg" alt="Zero-Race Concurrency Pipeline" width="100%" />
</p>

### Full Component Architecture (Mermaid)

CampusCore is structured around a strict **Layered MVC + Repository Pattern** ensuring decoupling, horizontal scalability, and bulletproof transactions:

```mermaid
graph TD
    subgraph Client ["Client Presentation Tier (React 18 + Vite)"]
        UI[Tailwind CSS + Lucide Icons UI]
        Route[React Router v6 Protected Shell]
        Scanner[html5-qrcode Camera Door Scanner]
        Portals[Admin / Treasurer / Volunteer / Member / Public Portals]
    end

    subgraph Gateway ["Security & Gateway Layer"]
        JWT[JWT Bearer Auth & Session Validator]
        RBAC[6-Tier Object-Level Role-Based Access Control]
        Lockout[Account Brute-Force Lockout Guard (5-Strikes)]
        Headers[Security Headers nosniff / SAMEORIGIN / Request-ID]
    end

    subgraph Domain ["Service & Domain Logic Tier"]
        AuthSvc[Auth & Session Service]
        MemberSvc[Membership & Digital Pass Service]
        EventSvc[Event & Seat Reservation Service]
        MerchSvc[Merchandise & Size Stock Service]
        DonationSvc[Crowdfunding & Multi-Stream Service]
        FinanceSvc[Treasury & Double-Entry Ledger Service]
        TaskSvc[Volunteer Task Dispatch Service]
    end

    subgraph Persistence ["Data & Concurrency Tier"]
        LockMgr["Pessimistic ACID Row Locks (SELECT FOR UPDATE)"]
        TxMgr["Atomic Database Transactions (BEGIN / COMMIT / ROLLBACK)"]
        HMAC["HMAC-SHA256 Cryptographic Token Engine"]
        BTreeIndex["PostgreSQL B-Tree Composite Index Engine"]
        PG[(PostgreSQL 16 Relational Storage - 17,000+ Rows)]
    end

    Client --> Route --> Gateway
    Gateway --> Domain
    Domain --> Persistence
    Persistence --> PG
```

### Layer Responsibilities

| Layer | Path Pattern | Strict Responsibilities |
| :--- | :--- | :--- |
| **Routes** | `modules/*/*.routes.js` | Pure HTTP route declarations, parameter parsing, and middleware chaining (`requireAuth`, `requireRole`, `idempotency`). Zero business rules. |
| **Controllers** | `modules/*/*.controller.js` | Request sanitization, query pagination normalization (`parsePaginationParams`), and HTTP status serialization. |
| **Services** | `modules/*/*.service.js` | Transaction orchestration, HMAC cryptographic signatures, atomic inventory subtractions, and financial ledger logging. |
| **Repositories**| `modules/*/*.repository.js` | Exclusively executes parameterized queries (`$1, $2`) to prevent SQL injection, enforces row locks (`FOR UPDATE`), and manages joins. |

---

## ✨ Feature Showcase

### 1. 🛡️ Authentication, Security Center & Session Control
- **6 Tiered Roles**: `admin`, `treasurer`, `event_manager`, `volunteer`, `member`, `guest`.
- **Brute-Force Account Protection**: Automatically locks accounts for 15 minutes after 5 consecutive failed login attempts (`ACCOUNT_LOCKED`).
- **Active Session Revocation**: Users and admins can view active sessions, device info, IP addresses, and revoke compromised tokens in real time.
- **Single-Use Password Reset**: Cryptographically generated password reset tokens invalidated immediately upon execution.
- **Immutable Audit Trail**: Logs all critical operations with user ID, action type, IP address, timestamp, and metadata payload delta.

### 2. 💳 Membership Lifecycle & Digital Passes
- **Dynamic Membership Lifecycle**: Auto-calculation of `ACTIVE`, `PENDING_PAYMENT`, and `EXPIRED` states.
- **Annual Calendar Expiry**: Enforces organization-wide expiration on **December 31** of the enrollment year.
- **Cryptographic Member Pass**: Generates dynamic QR cards encoded with user metadata and verified against the live database state.
- **Membership Dues Ledger**: Automatically records incoming membership dues directly into the financial ledger.

```mermaid
stateDiagram-v2
    [*] --> Guest: Register Account
    Guest --> PendingPayment: Apply for Membership
    PendingPayment --> Active: Pay Dues (Recorded in Ledger)
    Active --> Expired: Dec 31 Cutoff Reached
    Expired --> PendingPayment: Renew Dues
```

### 3. 🎟️ Event Ticketing & Zero-Race Engine
- **Last-Seat Concurrency Shield**: Uses `SELECT ... FOR UPDATE` within PostgreSQL transactions to guarantee that 10 concurrent requests for 1 remaining seat yield exactly 1 confirmation and 9 graceful `409 SEATS_UNAVAILABLE` responses.
- **Dual-Tier Dynamic Pricing**: Automatically detects `isActiveMember(userId)` at checkout to offer discounts, while allowing guests to purchase at public non-member prices.
- **HMAC-SHA256 Signed Tickets**: Ticket codes are cryptographically signed to prevent forged QR passes:
  ```text
  Format: <ticket_code>.<hmac_signature>
  Example: TCK-829104.a9f4c3b2e1
  ```
- **Door Check-In State Machine**:
  - `VALID` $\rightarrow$ First scan admits attendee and timestamps `checked_in_at`.
  - `ALREADY_USED` $\rightarrow$ Re-scans reject entry and show the original check-in timestamp.
  - `INVALID` $\rightarrow$ Tampered signatures or unknown codes are immediately flagged.
- **Human-Readable Fallback Scanning**: Attendees with broken screens can be checked in via manual door codes (`FB-000142`).

### 4. 👕 Merchandise Shop & Size Inventory Matrix
- **Matrix Inventory Management**: Independent stock counters per size variant (`S`, `M`, `L`, `XL`).
- **No Stock Locking on Pending Orders**: Inventory is only decremented upon successful payment, preventing abandoned cart stock denial attacks.
- **Member-Exclusive Pricing**: Automatically applies member discounts on branded campus apparel (Hoodies, T-Shirts, Caps).

### 5. 💖 Crowdfunding & Multi-Stream Fundraisers
- **Dual Revenue Aggregation**: Seamlessly combines **online donations** (Razorpay, UPI, Cards) and **offline campus cash/stall collections** into a unified campaign progress tracker.
- **Public Campaign Ticker**: Shows real-time percentage progress, goal milestones, donor counts, and recent donor messages.
- **Anonymous Donor Protection**: Donors can choose to mask their identity; the public API automatically sanitizes names as `"Anonymous Supporter"` and scrubs all PII (phone, email).
- **Admin Refund Engine**: Fully supported partial and full refunds with ledger tracking and net-amount adjustments.

```mermaid
flowchart LR
    A[Online Donation Checkout] -->|UPI / Card| B(donations table)
    C[Offline Campus Stall Cash] -->|Treasurer Entry| D(fundraiser_income table)
    B -->|Paid Status| E{Fundraiser Aggregator}
    D --> E
    E -->|COALESCE SUM| F[Real-Time Progress Bar &amp; Ledger]
```

### 6. ⚖️ Treasurer Double-Entry Ledger & Governance
- **Immutable Financial Ledger**: Single source of truth recording all inflows (`dues`, `ticket`, `merch`, `fundraiser`) and outflows (`expense`, `refund`).
- **Expense Claim Reimbursement**: Multi-stage workflow:
  ```
  Submission (with receipt URL) ──► Review ──► Admin/Treasurer Approval ──► Payout Reimbursement
  ```
- **"Who Still Owes" Roster**: Real-time debtor report identifying registered students who have not yet settled annual membership dues.
- **Automated Net Balance Calculation**: Live dashboard showing Cash-in-Bank, Total Revenue, Reimbursed Expenses, and Pending Outflows.

### 7. 📋 Volunteer Operations & Task Dispatch
- **Event Volunteer Rostering**: Application, approval, and management of student volunteers for campus events.
- **Task Dispatch Engine**: Kanban-style task assignment linked directly to fundraising drives and events with `TODO`, `IN_PROGRESS`, and `COMPLETED` lifecycle states.

### 8. 📢 Broadcast Communications & Announcements
- **Audience Targeting**: Broadcast public announcements to all visitors or restrict sensitive operational notices to active members.
- **Priority Pinning**: Important alerts can be pinned to the top of the campus bulletin.

---

## ⚡ Production Pagination Engine

To guarantee sub-20ms response times across tables with tens of thousands of records, CampusCore utilizes a unified, production-grade pagination engine:

```jsx
<Pagination
  currentPage={page}
  pageSize={limit}
  totalItems={totalCount}
  totalPages={totalPages}
  onPageChange={(newPage) => setPage(newPage)}
  onPageSizeChange={(newLimit) => setLimit(newLimit)}
  pageSizeOptions={[6, 12, 24, 48]}
/>
```

### Pagination Highlights
- 🧠 **Dynamic Windowing**: Renders clean page distributions with dynamic ellipses (`1 ... 4 5 6 ... 167`).
- 🚀 **Zero-Lag Database Indexing**: Backed by composite B-Tree indexes created in `020_pagination_indexes.sql`:
  - `idx_events_pagination (starts_at DESC, id DESC)`
  - `idx_tickets_pagination (user_id, status, created_at DESC)`
  - `idx_donations_fundraiser_status (fundraiser_id, status, created_at DESC)`
  - `idx_orders_pagination (user_id, payment_status, created_at DESC)`
- 📱 **Adaptive UI**: Full desktop navigation controls; compact mobile view with touch-friendly chevron controls.

---

## 📊 Database Schema & Mega Dataset (17,000+ Records)

The system is fully populated and verified with **17,000+ relational records** maintaining 100% foreign key referential integrity:

| Entity Table | Records | Primary Purpose & Key Relationships | Financial Impact |
| :--- | :---: | :--- | :---: |
| `users` | **1,000** | Students, Admins, Treasurers, Volunteers, and Guests | — |
| `memberships` | **1,000** | Dues status, tiers, join dates, Dec 31 expiration tracking | ₹500,000.00 |
| `announcements` | **1,000** | Campus-wide and member-targeted public broadcasts | — |
| `events` | **1,000** | Campus gatherings, gala nights, hackathons, capacity limits | — |
| `event_attendees` | **1,000** | Attendance records and non-member attendee profiles | — |
| `tickets` | **1,000** | Seat allocations, HMAC-SHA256 signatures, door codes | ₹250,000.00 |
| `products` | **1,000** | Merchandise catalog items (Hoodies, T-Shirts, Merch) | — |
| `product_sizes` | **1,000** | Independent inventory stock matrix per variant (`S`, `M`, `L`, `XL`) | — |
| `orders` | **1,000** | E-commerce orders with discount vouchers and payment state | ₹350,000.00 |
| `order_items` | **1,000** | Itemized order lines with unit pricing and variant IDs | — |
| `fundraisers` | **1,000** | Community campaigns, goal amounts, slugs, and deadlines | — |
| `fundraiser_income`| **1,000** | Offline campus stall & cash collections | ₹1,300,000.00 |
| `donations` | **2,000** | Online platform contributions (UPI, Cards, Netbanking) | ₹3,518,900.00 |
| `tasks` | **1,000** | Operational volunteer tasks linked to campaigns | — |
| `expenses` | **1,000** | Operational expense claims, receipt proofs, audit stamps | (₹450,000.00) |
| `transactions` | **1,000** | Immutable double-entry financial ledger entries | **Net Reconciled** |
| **TOTAL** | **17,000+** | **100% Referential Integrity & Zero Orphan Rows** | **₹5,468,900.00** |

### Sequence Safety Guarantee
All PostgreSQL sequences (`users_id_seq`, `fundraisers_id_seq`, `donations_id_seq`, etc.) are synchronized to `MAX(id)`, guaranteeing that subsequent manual or API-driven inserts start safely at `1001` or `2001` without duplicate key errors:

```sql
SELECT setval('donations_id_seq', (SELECT MAX(id) FROM donations));
SELECT setval('fundraisers_id_seq', (SELECT MAX(id) FROM fundraisers));
```

---

## 🧪 Test Suite & Audit Results

CampusCore features a comprehensive automated test suite covering all critical security, financial, and concurrency invariants:

```text
================================================================================
CAMPUSCORE AUTOMATED SYSTEM VERIFICATION (10 TEST SUITES)
================================================================================
>>> 1. Health & Core System Checks                       [PASSED]  (6 tests)
>>> 2. Authentication, Roles & Passwords                 [PASSED]  (18 tests)
>>> 3. Membership Lifecycle & Pass Verification          [PASSED]  (22 tests)
>>> 4. Announcements & Audience Filtering                [PASSED]  (14 tests)
>>> 5. Events, Ticketing & Seat Concurrency              [PASSED]  (57 tests)
>>> 6. Merchandise Catalog & Atomic Stock Reduction      [PASSED]  (31 tests)
>>> 7. Financial Ledger, Expenses & Reconciliations     [PASSED]  (28 tests)
>>> 8. Fallback Door Codes, Volunteers & Cancellations   [PASSED]  (47 tests)
>>> 9. Security Center, Session Revocation & Lockout    [PASSED]  (57 tests)
>>> 10. Fundraiser & Real Donation Financial Lifecycle   [PASSED]  (43 tests)
================================================================================
ALL 10 TEST SUITES COMPLETE: 323 PASSED, 0 FAILED (100% SUCCESS)
================================================================================
```

### High-Value Automated Invariant Tests
- 🛡️ **Race Condition Defense**: Concurrently checkouts the last remaining ticket for an event across multiple parallel threads; verifies that exactly 1 ticket succeeds and remaining seats never go negative.
- 🎟️ **Door Check-In Scanning**: Tests valid QR check-in, duplicate scan rejection with original timestamp, and tampered HMAC signature detection.
- 🔒 **Account Lockout Machine**: Simulates 5 failed logins, asserts `ACCOUNT_LOCKED` 403 response, tests admin unlocking, and verifies password reset token single-use invalidation.
- 💵 **Financial Invariance**: Asserts that `total_raised = gross_amount - refunded_amount` and verifies that pending donations do not alter ledger totals until confirmed paid.

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **PostgreSQL**: v14.0 or higher (v16 recommended)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/Rachit-Kakkad1/Odoo_X_LDCE.git
cd Odoo_X_LDCE
```

### 2. Configure Environment Variables
Create `.env` in the `backend/` directory:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgres://postgres:password@localhost:5432/campuscore
JWT_SECRET=campuscore_super_secret_jwt_key_2026
HMAC_SECRET=campuscore_qr_hmac_secret_key_2026
```

### 3. Database Initialization & Mega Seeding
```bash
cd backend
npm install

# Run database schema migrations
npm run db:migrate

# Seed the 17,000+ record production dataset with synchronized sequences
npm run db:seed:mega
```

### 4. Start the Backend API Server
```bash
# Starts Express server on http://localhost:5000
npm run dev
```

### 5. Start the Frontend Application
Open a new terminal:
```bash
cd frontend
npm install

# Starts Vite development server on http://localhost:5173
npm run dev
```

### 6. Run the Automated Test Suite
```bash
cd backend
npm test
```

---

## 👥 Default Demo Credentials

For live evaluation and judging, the database includes pre-configured accounts for every role tier:

| Role | Email | Password | Primary Access & Evaluation Flow |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@ldce.ac.in` | `Admin123!` | Full System Control, Security Center, Audit Logs, Approvals |
| **Treasurer** | `treasurer@ldce.ac.in` | `Treasurer123!` | Finance Ledger, Expense Approvals, Debtor Reports, Stall Income |
| **Event Manager** | `events@ldce.ac.in` | `Manager123!` | Event Scheduling, Attendee Roster, Camera Door Scanner |
| **Volunteer** | `volunteer@ldce.ac.in` | `Volunteer123!` | Task Kanban, Door Scanning, Expense Reimbursement Claims |
| **Active Member** | `member@ldce.ac.in` | `Member123!` | Digital QR Member Pass, Member Discounts, Event Tickets |
| **Guest / Student** | `guest@ldce.ac.in` | `Guest123!` | Public Catalog, Standard Event Tickets, Crowdfunding Drives |

---

## 📡 API Reference

All backend routes are prefixed with `/api`. Protected routes require a valid `Authorization: Bearer <token>` header.

### 🔐 Authentication & Security (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register student account & issue JWT |
| `POST` | `/api/auth/login` | Public | Authenticate user with lockout protection |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile & membership |
| `GET` | `/api/auth/sessions` | Authenticated | List all active sessions for current user |
| `DELETE` | `/api/auth/sessions/:id` | Authenticated | Revoke a session token |
| `POST` | `/api/auth/forgot-password`| Public | Generate dev reset token |
| `POST` | `/api/auth/reset-password` | Public | Reset password using single-use token |

### 🎟️ Events & Ticketing (`/api/events`, `/api/tickets`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | Public | Paginated event catalog with status filters |
| `POST` | `/api/events` | Admin/Manager | Schedule event with capacity & dual pricing |
| `POST` | `/api/events/:id/cancel` | Admin | Cancel event and disable ticket checkout |
| `POST` | `/api/tickets/checkout` | Authenticated | Initiate ticket checkout (no seat lock) |
| `POST` | `/api/tickets/:id/pay` | Authenticated | Atomic seat decrement & payment confirmation |
| `GET` | `/api/tickets/:id/qr` | Ticket Owner | Fetch signed HMAC-SHA256 QR code payload |
| `POST` | `/api/tickets/check-in` | Manager/Vol | Scan & validate door ticket with timestamp |

### 💖 Fundraisers & Crowdfunding (`/api/fundraisers`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/fundraisers` | Public | Paginated campaign directory with real totals |
| `GET` | `/api/fundraisers/:id` | Public | Campaign detail, progress bar, recent donors |
| `POST` | `/api/fundraisers/:id/donations/checkout` | Public | Create pending donation (Guest or User) |
| `POST` | `/api/fundraisers/donations/:id/pay` | Public | Finalize donation & log to financial ledger |
| `POST` | `/api/fundraisers/donations/:id/refund` | Admin/Treas | Process partial/full refund & update net stats |
| `GET` | `/api/fundraisers/admin/stats` | Admin/Treas | High-level financial analytics overview |
| `GET` | `/api/fundraisers/admin/donations` | Admin/Treas | Paginated donations ledger with audit filters |

### ⚖️ Treasury & Ledger (`/api/finance`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/finance/overview` | Admin/Treas | Cash balance, total revenue, expenses |
| `GET` | `/api/finance/transactions` | Admin/Treas | Paginated immutable double-entry ledger |
| `GET` | `/api/finance/unpaid-dues` | Admin/Treas | Roster of members with unpaid dues |
| `POST` | `/api/finance/fundraiser-income` | Treasurer | Log offline campus stall collection |
| `POST` | `/api/finance/expenses` | Authenticated | Submit expense reimbursement claim |
| `PATCH`| `/api/finance/expenses/:id/approve` | Admin/Treas | Approve submitted expense claim |
| `PATCH`| `/api/finance/expenses/:id/reimburse`| Treasurer | Mark claim reimbursed & record outflow |

### 👕 Merchandise & Shop (`/api/merchandise`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/merchandise` | Public | Apparel catalog with per-size stock levels |
| `POST` | `/api/merchandise/orders` | Authenticated | Create pending order with size selection |
| `POST` | `/api/merchandise/orders/:id/pay` | Authenticated | Atomic stock reduction & invoice creation |
| `GET` | `/api/merchandise/orders/mine` | Authenticated | Personal merchandise purchase history |

---

## 👥 Role-Based Access Matrix

| System Module / Capability | `admin` | `treasurer` | `event_manager` | `volunteer` | `member` | `guest` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **System Security & Audit Logs** | 🟢 Full | 🔴 Denied | 🔴 Denied | 🔴 Denied | 🔴 Denied | 🔴 Denied |
| **Account Unlock / Password Admin**| 🟢 Full | 🔴 Denied | 🔴 Denied | 🔴 Denied | 🔴 Denied | 🔴 Denied |
| **Treasurer Ledger & Financial Balance**| 🟢 View | 🟢 Full | 🔴 Denied | 🔴 Denied | 🔴 Denied | 🔴 Denied |
| **Expense Approval & Reimbursement**| 🟢 Approve | 🟢 Full | 🔴 Denied | 🟡 Submit | 🟡 Submit | 🔴 Denied |
| **Event Scheduling & Cancellation**| 🟢 Full | 🔴 Denied | 🟢 Full | 🔴 Denied | 🔴 Denied | 🔴 Denied |
| **Door Ticket Scanning (Camera/Code)**| 🟢 Full | 🔴 Denied | 🟢 Full | 🟢 Full | 🔴 Denied | 🔴 Denied |
| **Fundraiser Launch & Edit** | 🟢 Full | 🟢 Full | 🔴 Denied | 🔴 Denied | 🔴 Denied | 🔴 Denied |
| **Donation Refund Execution** | 🟢 Full | 🟢 Full | 🔴 Denied | 🔴 Denied | 🔴 Denied | 🔴 Denied |
| **Merchandise Inventory Stock Adjust**| 🟢 Full | 🔴 Denied | 🔴 Denied | 🔴 Denied | 🔴 Denied | 🔴 Denied |
| **Member Pass & Discount Privileges**| 🟢 Yes | 🟢 Yes | 🟢 Yes | 🟢 Yes | 🟢 Active | 🔴 Public |
| **Public Ticket & Merch Purchases** | 🟢 Yes | 🟢 Yes | 🟢 Yes | 🟢 Yes | 🟢 Discount | 🟢 Standard|
| **Public Crowdfunding Donations** | 🟢 Yes | 🟢 Yes | 🟢 Yes | 🟢 Yes | 🟢 Yes | 🟢 Yes |

---

## 📜 Team & Hackathon Credits

Engineered with passion and engineering rigor for the **Odoo × LDCE 24-Hour Hackathon 2026**:

<div align="center">

| Developer | Core Subsystems & Engineering Ownership |
| :--- | :--- |
| **Nishit** | System Architecture, Security Center, Audit Logs, Membership Pass Engine |
| **Rachit** | Event Ticketing, Concurrency Shield, HMAC Door Scanning, Universal Pagination |
| **Harshit** | Merchandise Apparel Shop, Size Matrix Inventory, Order Lifecycle |
| **Tapan** | Treasury Double-Entry Ledger, Crowdfunding Inflows, Expense Reimbursements |

<br/>

<sub>CampusCore OS is open-source software released under the <a href="LICENSE">MIT License</a>. Crafted with engineering excellence for LDCE &amp; Odoo.</sub>

</div>
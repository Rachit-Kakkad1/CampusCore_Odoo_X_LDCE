# Demo Flow — Skyline Student Organization System

This document outlines the six core MVP demonstration scenes for the 24-hour Odoo × LDCE Hackathon showcase.

---

## Scene 1: Membership
- **Goal**: Showcase user registration, dues payment lifecycle, and membership pass generation.
- **Flow**:
  1. A guest user registers on the platform.
  2. The user navigates to the Membership tab showing `PENDING` status.
  3. The user pays membership dues (₹500.00).
  4. The system updates dues status to `paid` and derives `ACTIVE` membership with an expiry date.
  5. The verified digital membership pass becomes active with QR code validation.

---

## Scene 2: Spring Gala (Events & Ticketing)
- **Goal**: Demonstrate tiered pricing, ticket purchasing, seat inventory, and QR check-in.
- **Flow**:
  1. Active members see the discounted member price (₹300.00), while non-members see standard price (₹500.00).
  2. User purchases a ticket for Spring Gala.
  3. Seat remaining count decrements atomically upon payment completion.
  4. The user receives a unique digital ticket with signed QR code.
  5. Event manager checks in the attendee using QR code validation.

---

## Scene 3: Announcements
- **Goal**: Demonstrate club communication and broadcast capability.
- **Flow**:
  1. Officers post announcements (e.g. Welcome message, Gala ticket release).
  2. Members and guests view chronologically sorted announcements on the dashboard.

---

## Scene 4: Merchandise (Shop & Orders)
- **Goal**: Demonstrate merchandise catalog, member discount, size variant inventory, and atomic stock decrement.
- **Flow**:
  1. User browses merchandise (Club Hoodie, Club T-Shirt) with size variants.
  2. Active members automatically receive the 10% member discount.
  3. User places an order for a specific size (e.g., Size L).
  4. Upon successful payment, size-specific stock decrements atomically without overselling.

---

## Scene 5: Fundraiser & Tasks
- **Goal**: Demonstrate community campaign management, volunteer task tracking, and multi-entry income recording.
- **Flow**:
  1. Admin sets up the Bake Sale fundraiser with target goal (₹5000.00).
  2. Tasks are assigned to volunteers with status progression (`TODO` → `IN_PROGRESS` → `COMPLETED`).
  3. Multiple income batches are logged for the fundraiser, updating the total raised progress.

---

## Scene 6: Treasurer / Finance Ledger
- **Goal**: Demonstrate unified financial transparency, expense lifecycle, and the central transaction ledger.
- **Flow**:
  1. Committee members submit expenses with receipts for club activities.
  2. Treasurer reviews, approves, and reimburses the expenses.
  3. All monetary flows (dues, tickets, merchandise, fundraiser income, and expense reimbursements) appear in the immutable transactions ledger with correct source IDs and directions.

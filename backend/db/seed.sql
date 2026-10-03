-- =============================================================================
-- Student Organization System — Seed Data
-- 24-Hour Hackathon — Odoo x LDCE
-- =============================================================================

-- Clear existing data cleanly before seeding
TRUNCATE TABLE transactions, expenses, fundraiser_income, tasks, fundraisers,
               order_items, orders, product_sizes, products,
               tickets, event_attendees, events, announcements, memberships, users
               RESTART IDENTITY CASCADE;

-- -----------------------------------------------------------------------------
-- 1. SEED USERS (Default password: password123)
-- -----------------------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin User',     'admin@odoo-ldce.org',     '$2b$10$lwqa42ob3jniXSy8RrogvuNbtG.5q6.LYoGHhaTf1Oi6l5O4EKDpu', 'admin'),
  ('Tara Treasurer', 'tara@odoo-ldce.org',      '$2b$10$lwqa42ob3jniXSy8RrogvuNbtG.5q6.LYoGHhaTf1Oi6l5O4EKDpu', 'treasurer'),
  ('Ethan Events',   'ethan@odoo-ldce.org',     '$2b$10$lwqa42ob3jniXSy8RrogvuNbtG.5q6.LYoGHhaTf1Oi6l5O4EKDpu', 'event_manager'),
  ('Vik Volunteer',  'vik@odoo-ldce.org',       '$2b$10$lwqa42ob3jniXSy8RrogvuNbtG.5q6.LYoGHhaTf1Oi6l5O4EKDpu', 'volunteer'),
  ('Maya Member',    'maya@odoo-ldce.org',      '$2b$10$lwqa42ob3jniXSy8RrogvuNbtG.5q6.LYoGHhaTf1Oi6l5O4EKDpu', 'member'),
  ('Eddie Expired',  'eddie@odoo-ldce.org',     '$2b$10$lwqa42ob3jniXSy8RrogvuNbtG.5q6.LYoGHhaTf1Oi6l5O4EKDpu', 'member'),
  ('Greg Guest',     'greg@odoo-ldce.org',      '$2b$10$lwqa42ob3jniXSy8RrogvuNbtG.5q6.LYoGHhaTf1Oi6l5O4EKDpu', 'member'),
  ('Pia Pending',    'pia@odoo-ldce.org',       '$2b$10$lwqa42ob3jniXSy8RrogvuNbtG.5q6.LYoGHhaTf1Oi6l5O4EKDpu', 'member');

-- -----------------------------------------------------------------------------
-- 2. SEED EVENT ATTENDEES (Public guest attendees without user accounts)
-- -----------------------------------------------------------------------------
INSERT INTO event_attendees (name, email, mobile) VALUES
  ('Guest Attendee', 'guest@odoo-ldce.org', '9876543210');

-- -----------------------------------------------------------------------------
-- 3. SEED MEMBERSHIPS (Covers all 5 core states + renewal + expiring)
-- -----------------------------------------------------------------------------
-- 1. Maya Member (user_id = 5): ACTIVE (paid, future expiry)
INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, created_at, updated_at)
SELECT 1, id, 'SKY-MEM-005-MAYA', 'active', 'paid', 500.00,
  NOW() - INTERVAL '3 months',
  NOW() + INTERVAL '9 months',
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '3 months'
FROM users WHERE email = 'maya@odoo-ldce.org';

-- 2. Eddie Expired (user_id = 6): RENEWAL CHAIN (Part 1: Historical Expired)
INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, created_at, updated_at)
SELECT 2, id, 'SKY-MEM-006-EDDIE-2025', 'expired', 'paid', 500.00,
  NOW() - INTERVAL '14 months',
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '14 months',
  NOW() - INTERVAL '14 months',
  NOW() - INTERVAL '2 months'
FROM users WHERE email = 'eddie@odoo-ldce.org';

-- 3. Eddie Expired (user_id = 6): RENEWAL CHAIN (Part 2: Active Renewal referencing ID 2)
INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, renewed_from_membership_id, created_at, updated_at)
SELECT 3, id, 'SKY-MEM-006-EDDIE-2026', 'active', 'paid', 500.00,
  NOW() - INTERVAL '2 months',
  NOW() + INTERVAL '10 months',
  NOW() - INTERVAL '2 months',
  2,
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '2 months'
FROM users WHERE email = 'eddie@odoo-ldce.org';

-- 4. Pia Pending (user_id = 8): PENDING (unpaid, dues pending)
INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, created_at, updated_at)
SELECT 4, id, 'SKY-MEM-008-PIA', 'pending', 'pending', 500.00,
  NULL, NULL, NULL,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
FROM users WHERE email = 'pia@odoo-ldce.org';

-- 5. Vik Volunteer (user_id = 4): EXPIRED (past expiry, dues were paid)
INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, created_at, updated_at)
SELECT 5, id, 'SKY-MEM-004-VIK', 'expired', 'paid', 500.00,
  NOW() - INTERVAL '13 months',
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '13 months',
  NOW() - INTERVAL '13 months',
  NOW() - INTERVAL '1 month'
FROM users WHERE email = 'vik@odoo-ldce.org';

-- 6. Greg Guest (user_id = 7): CANCELLED (was active, cancelled with reason)
INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, cancelled_at, cancellation_reason, payment_timestamp, created_at, updated_at)
SELECT 6, id, 'SKY-MEM-007-GREG', 'cancelled', 'paid', 500.00,
  NOW() - INTERVAL '4 months',
  NOW() + INTERVAL '8 months',
  NOW() - INTERVAL '10 days',
  'Member requested cancellation due to transfer to another campus',
  NOW() - INTERVAL '4 months',
  NOW() - INTERVAL '4 months',
  NOW() - INTERVAL '10 days'
FROM users WHERE email = 'greg@odoo-ldce.org';

-- 7. Tara Treasurer (user_id = 2): EXPIRING CRITICAL (Active, expires in 5 days <= 7 days)
INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, created_at, updated_at)
SELECT 7, id, 'SKY-MEM-002-TARA', 'active', 'paid', 500.00,
  NOW() - INTERVAL '360 days',
  NOW() + INTERVAL '5 days',
  NOW() - INTERVAL '360 days',
  NOW() - INTERVAL '360 days',
  NOW() - INTERVAL '360 days'
FROM users WHERE email = 'tara@odoo-ldce.org';

-- 8. Ethan Events (user_id = 3): EXPIRING SOON (Active, expires in 20 days <= 30 days)
INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, created_at, updated_at)
SELECT 8, id, 'SKY-MEM-003-ETHAN', 'active', 'paid', 500.00,
  NOW() - INTERVAL '345 days',
  NOW() + INTERVAL '20 days',
  NOW() - INTERVAL '345 days',
  NOW() - INTERVAL '345 days',
  NOW() - INTERVAL '345 days'
FROM users WHERE email = 'ethan@odoo-ldce.org';

SELECT setval('memberships_id_seq', (SELECT MAX(id) FROM memberships));

-- -----------------------------------------------------------------------------
-- 4. SEED INITIAL DUES TRANSACTIONS
-- -----------------------------------------------------------------------------
INSERT INTO transactions (source_type, source_id, user_id, amount, direction, payment_mode, status)
SELECT 'dues', m.id, m.user_id, m.dues_amount, 'in', 'online', 'paid'
FROM memberships m
WHERE m.dues_status = 'paid';

-- -----------------------------------------------------------------------------
-- 4. SEED EVENTS
-- -----------------------------------------------------------------------------
-- Spring Gala: capacity 100
INSERT INTO events (title, venue, starts_at, capacity, seats_remaining, member_price, non_member_price)
VALUES (
  'Spring Gala 2026',
  'Main Auditorium',
  '2026-11-15 18:00:00+05:30',
  100,
  100,
  300.00,
  500.00
);

-- Mini Workshop: capacity 2 (for oversell and race condition tests)
INSERT INTO events (title, venue, starts_at, capacity, seats_remaining, member_price, non_member_price)
VALUES (
  'Mini Workshop',
  'Lab 301',
  '2026-10-20 14:00:00+05:30',
  2,
  2,
  100.00,
  200.00
);

-- -----------------------------------------------------------------------------
-- 5. SEED TICKETS (Guest Attendee Ticket linked via attendee_id)
-- -----------------------------------------------------------------------------
INSERT INTO tickets (ticket_code, event_id, attendee_id, price, price_type, payment_status)
SELECT 'TCK-SEED-GUEST-001', e.id, a.id, e.non_member_price, 'non_member', 'pending'
FROM events e
CROSS JOIN event_attendees a
WHERE e.title = 'Spring Gala 2026' AND a.email = 'guest@odoo-ldce.org'
LIMIT 1;

-- -----------------------------------------------------------------------------
-- 6. SEED PRODUCTS & PRODUCT SIZES
-- -----------------------------------------------------------------------------
-- Club Hoodie: Rs 1200 with Size L stock = 1 (for oversell tests)
WITH hoodie AS (
  INSERT INTO products (name, price, image_url)
  VALUES ('Club Hoodie', 1200.00, 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500')
  RETURNING id
)
INSERT INTO product_sizes (product_id, size, stock)
SELECT id, size, stock FROM hoodie, (VALUES
  ('S', 10),
  ('M', 10),
  ('L', 1),   -- Stock 1 for oversell testing
  ('XL', 5)
) AS sizes(size, stock);

-- Club T-Shirt: Rs 600
WITH tshirt AS (
  INSERT INTO products (name, price, image_url)
  VALUES ('Club T-Shirt', 600.00, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500')
  RETURNING id
)
INSERT INTO product_sizes (product_id, size, stock)
SELECT id, size, stock FROM tshirt, (VALUES
  ('S', 15),
  ('M', 20),
  ('L', 15),
  ('XL', 10)
) AS sizes(size, stock);

-- -----------------------------------------------------------------------------
-- 6. SEED FUNDRAISERS & TASKS
-- -----------------------------------------------------------------------------
WITH bake_sale AS (
  INSERT INTO fundraisers (title, description, created_by)
  SELECT 'Bake Sale', 'Annual student organization charity bake sale fundraiser', id
  FROM users WHERE email = 'admin@odoo-ldce.org'
  RETURNING id
)
INSERT INTO tasks (fundraiser_id, title, assignee_id, status)
SELECT bs.id, t.title, u.id, t.status
FROM bake_sale bs
CROSS JOIN users u
CROSS JOIN (VALUES
  ('Procure baking ingredients and supplies', 'completed'),
  ('Set up sales stall and banners',         'in_progress'),
  ('Manage sales and cash register',          'todo')
) AS t(title, status)
WHERE u.email = 'vik@odoo-ldce.org';

-- -----------------------------------------------------------------------------
-- 7. SEED ANNOUNCEMENTS (priorities, categories, draft/published)
-- -----------------------------------------------------------------------------
INSERT INTO announcements (title, body, priority, category, status, published_at, created_by, created_at)
SELECT
  'Welcome to the New Academic Year 2026-2027!',
  'Welcome all LDCE students to the new academic year! Explore clubs, orientation sessions, and leadership programs across campus.',
  'normal', 'academic', 'published', NOW() - INTERVAL '30 days',
  id, NOW() - INTERVAL '30 days'
FROM users WHERE email = 'admin@odoo-ldce.org';

INSERT INTO announcements (title, body, priority, category, status, published_at, created_by, created_at)
SELECT
  'Spring Gala 2026: Early Bird Passes Now Available',
  'Early bird tickets for Spring Gala 2026 are officially released. Registered members receive an exclusive discount on passes!',
  'important', 'event', 'published', NOW() - INTERVAL '14 days',
  id, NOW() - INTERVAL '14 days'
FROM users WHERE email = 'admin@odoo-ldce.org';

INSERT INTO announcements (title, body, priority, category, status, published_at, created_by, created_at)
SELECT
  'Urgent: Electrical Maintenance & Auditorium Closure',
  'Main campus auditorium will be closed this Wednesday due to emergency electrical maintenance. All sessions relocated to Hall B.',
  'urgent', 'urgent', 'published', NOW() - INTERVAL '5 days',
  id, NOW() - INTERVAL '5 days'
FROM users WHERE email = 'admin@odoo-ldce.org';

INSERT INTO announcements (title, body, priority, category, status, published_at, created_by, created_at)
SELECT
  'Annual Student Organization Membership Dues Deadline',
  'Membership dues for this academic semester must be settled by next week to retain voting privileges and access to club resources.',
  'important', 'membership', 'published', NOW() - INTERVAL '3 days',
  id, NOW() - INTERVAL '3 days'
FROM users WHERE email = 'admin@odoo-ldce.org';

INSERT INTO announcements (title, body, priority, category, status, published_at, created_by, created_at)
SELECT
  'Q1 Financial Transparency & Budget Utilization Report',
  'The treasurer has published the Q1 financial report. All transaction ledgers and fundraising revenues are accessible for student review.',
  'normal', 'finance', 'published', NOW() - INTERVAL '2 days',
  id, NOW() - INTERVAL '2 days'
FROM users WHERE email = 'admin@odoo-ldce.org';

INSERT INTO announcements (title, body, priority, category, status, published_at, created_by, created_at)
SELECT
  'Volunteer Orientation and Team Sign-Up Camp',
  'Join us this Friday at the Student Union Lounge for an interactive orientation camp. Discover open committee roles and earn service hours.',
  'normal', 'general', 'published', NOW() - INTERVAL '1 day',
  id, NOW() - INTERVAL '1 day'
FROM users WHERE email = 'admin@odoo-ldce.org';

INSERT INTO announcements (title, body, priority, category, status, published_at, created_by, created_at)
SELECT
  'Hackathon Finalists Presentation Schedule (DRAFT)',
  'Internal draft agenda for the upcoming hackathon finalist project showcases. Pending committee sign-off before official publication.',
  'important', 'event', 'draft', NULL,
  id, NOW()
FROM users WHERE email = 'admin@odoo-ldce.org';

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
  ('Pia Pending',    'pia@odoo-ldce.org',       '$2b$10$lwqa42ob3jniXSy8RrogvuNbtG.5q6.LYoGHhaTf1Oi6l5O4EKDpu', 'member');

-- -----------------------------------------------------------------------------
-- 2. SEED EVENT ATTENDEES (Public guest attendees without user accounts)
-- -----------------------------------------------------------------------------
INSERT INTO event_attendees (name, email, mobile) VALUES
  ('Guest Attendee', 'guest@odoo-ldce.org', '9876543210');

-- -----------------------------------------------------------------------------
-- 3. SEED MEMBERSHIPS (Complete Lifecycle States)
-- -----------------------------------------------------------------------------
-- Maya Member: ACTIVE (paid, started 1 month ago, expires in 11 months)
INSERT INTO memberships (user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp)
SELECT id, 'MEM-2026-MAYA', 'active', 'paid', 500.00, NOW() - INTERVAL '1 month', NOW() + INTERVAL '11 months', NOW() - INTERVAL '1 month'
FROM users WHERE email = 'maya@odoo-ldce.org';

-- Eddie Expired: EXPIRED (paid 2 years ago, expired 1 year ago)
INSERT INTO memberships (user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp)
SELECT id, 'MEM-2025-EDDIE', 'expired', 'paid', 500.00, NOW() - INTERVAL '2 years', NOW() - INTERVAL '1 year', NOW() - INTERVAL '2 years'
FROM users WHERE email = 'eddie@odoo-ldce.org';

-- Pia Pending: PENDING (dues not yet paid, no start or expiry date)
INSERT INTO memberships (user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp)
SELECT id, 'MEM-2026-PIA', 'pending', 'pending', 500.00, NULL, NULL, NULL
FROM users WHERE email = 'pia@odoo-ldce.org';

-- -----------------------------------------------------------------------------
-- 3. SEED INITIAL DUES TRANSACTIONS (FOR ACTIVE & EXPIRED MEMBERS WHO PAID)
-- -----------------------------------------------------------------------------
INSERT INTO transactions (source_type, source_id, user_id, amount, direction, payment_mode, status)
SELECT 'dues', m.id, u.id, 500.00, 'in', 'online', 'paid'
FROM memberships m
JOIN users u ON m.user_id = u.id
WHERE u.email = 'maya@odoo-ldce.org';

INSERT INTO transactions (source_type, source_id, user_id, amount, direction, payment_mode, status)
SELECT 'dues', m.id, u.id, 500.00, 'in', 'online', 'paid'
FROM memberships m
JOIN users u ON m.user_id = u.id
WHERE u.email = 'eddie@odoo-ldce.org';

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
-- 7. SEED ANNOUNCEMENTS
-- -----------------------------------------------------------------------------
INSERT INTO announcements (title, body, created_by)
SELECT
  'Welcome to the New Academic Year!',
  'Welcome all students to the LDCE Student Organization! Check out our upcoming events, join membership, and get involved in our campus activities.',
  id
FROM users WHERE email = 'admin@odoo-ldce.org';

INSERT INTO announcements (title, body, created_by)
SELECT
  'Spring Gala Tickets Announced',
  'Early tickets for Spring Gala 2026 are now open. Members enjoy discounted tickets!',
  id
FROM users WHERE email = 'admin@odoo-ldce.org';

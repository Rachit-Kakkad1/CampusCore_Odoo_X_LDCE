-- backend/db/seeds/seed_data.sql
-- Deterministic seed data for demo personas, memberships, events, tickets, merchandise, orders, fundraisers, expenses, and transactions

BEGIN;

-- Clean existing data before seeding
TRUNCATE TABLE users, events, products, fundraisers RESTART IDENTITY CASCADE;

-- 1. USERS
INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Admin User', 'admin@skyline.org', '$2a$10$wT8K8U1yR6hP0V2kLpU3ge0h5kYz9H8eJ0aYyW3dZ2tM4yN6pB3m.', 'admin'),
(2, 'Tara Treasurer', 'tara@skyline.org', '$2a$10$wT8K8U1yR6hP0V2kLpU3ge0h5kYz9H8eJ0aYyW3dZ2tM4yN6pB3m.', 'treasurer'),
(3, 'Ethan Events', 'ethan@skyline.org', '$2a$10$wT8K8U1yR6hP0V2kLpU3ge0h5kYz9H8eJ0aYyW3dZ2tM4yN6pB3m.', 'event_manager'),
(4, 'Vik Volunteer', 'vik@skyline.org', '$2a$10$wT8K8U1yR6hP0V2kLpU3ge0h5kYz9H8eJ0aYyW3dZ2tM4yN6pB3m.', 'volunteer'),
(5, 'Maya Member', 'maya@skyline.org', '$2a$10$wT8K8U1yR6hP0V2kLpU3ge0h5kYz9H8eJ0aYyW3dZ2tM4yN6pB3m.', 'member'),
(6, 'Eddie Expired', 'eddie@skyline.org', '$2a$10$wT8K8U1yR6hP0V2kLpU3ge0h5kYz9H8eJ0aYyW3dZ2tM4yN6pB3m.', 'member'),
(7, 'Greg Guest', 'greg@skyline.org', '$2a$10$wT8K8U1yR6hP0V2kLpU3ge0h5kYz9H8eJ0aYyW3dZ2tM4yN6pB3m.', 'guest'),
(8, 'Pia Pending', 'pia@skyline.org', '$2a$10$wT8K8U1yR6hP0V2kLpU3ge0h5kYz9H8eJ0aYyW3dZ2tM4yN6pB3m.', 'guest')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 2. MEMBERSHIPS
INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, cancelled_at, cancellation_reason, payment_timestamp, renewed_from_membership_id, created_at, updated_at) VALUES
(1, 5, 'SKY-MEM-005-MAYA', 'active', 'paid', 500.00, NOW() - INTERVAL '3 months', NOW() + INTERVAL '9 months', NULL, NULL, NOW() - INTERVAL '3 months', NULL, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
(2, 6, 'SKY-MEM-006-EDDIE-2025', 'expired', 'paid', 500.00, NOW() - INTERVAL '14 months', NOW() - INTERVAL '2 months', NULL, NULL, NOW() - INTERVAL '14 months', NULL, NOW() - INTERVAL '14 months', NOW() - INTERVAL '2 months'),
(3, 6, 'SKY-MEM-006-EDDIE-2026', 'active', 'paid', 500.00, NOW() - INTERVAL '2 months', NOW() + INTERVAL '10 months', NULL, NULL, NOW() - INTERVAL '2 months', 2, NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
(4, 8, 'SKY-MEM-008-PIA', 'pending', 'pending', 500.00, NULL, NULL, NULL, NULL, NULL, NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
(5, 4, 'SKY-MEM-004-VIK', 'expired', 'paid', 500.00, NOW() - INTERVAL '13 months', NOW() - INTERVAL '1 month', NULL, NULL, NOW() - INTERVAL '13 months', NULL, NOW() - INTERVAL '13 months', NOW() - INTERVAL '1 month'),
(6, 7, 'SKY-MEM-007-GREG', 'cancelled', 'paid', 500.00, NOW() - INTERVAL '4 months', NOW() + INTERVAL '8 months', NOW() - INTERVAL '10 days', 'Member requested cancellation due to transfer to another campus', NOW() - INTERVAL '4 months', NULL, NOW() - INTERVAL '4 months', NOW() - INTERVAL '10 days'),
(7, 2, 'SKY-MEM-002-TARA', 'active', 'paid', 500.00, NOW() - INTERVAL '360 days', NOW() + INTERVAL '5 days', NULL, NULL, NOW() - INTERVAL '360 days', NULL, NOW() - INTERVAL '360 days', NOW() - INTERVAL '360 days')
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  member_code = EXCLUDED.member_code,
  status = EXCLUDED.status,
  dues_status = EXCLUDED.dues_status,
  dues_amount = EXCLUDED.dues_amount,
  started_at = EXCLUDED.started_at,
  expiry_date = EXCLUDED.expiry_date,
  cancelled_at = EXCLUDED.cancelled_at,
  cancellation_reason = EXCLUDED.cancellation_reason,
  payment_timestamp = EXCLUDED.payment_timestamp,
  renewed_from_membership_id = EXCLUDED.renewed_from_membership_id,
  updated_at = EXCLUDED.updated_at;

SELECT setval('memberships_id_seq', (SELECT MAX(id) FROM memberships));


-- 3. ANNOUNCEMENTS
INSERT INTO announcements (id, title, body, created_by) VALUES
(1, 'Welcome to Skyline Student Organization!', 'Welcome everyone to the new semester! Check out upcoming events and official club merchandise.', 1),
(2, 'Spring Gala Registration Open', 'Early bird tickets are now live for the annual Spring Gala flagship event!', 3)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  created_by = EXCLUDED.created_by;

SELECT setval('announcements_id_seq', (SELECT MAX(id) FROM announcements));

-- 4. EVENTS
INSERT INTO events (id, title, description, venue, starts_at, capacity, seats_remaining, member_price, non_member_price, created_by) VALUES
(1, 'Spring Gala', 'Annual flagship gathering featuring keynote addresses, dinners, and networking.', 'Grand Ballroom, Campus Center', '2026-11-15 18:00:00+00', 100, 98, 300.00, 500.00, 3),
(2, 'Mini Workshop', 'Hands-on technical workshop on system design and enterprise development.', 'Lab 204, Tech Hall', '2026-11-20 14:00:00+00', 2, 2, 50.00, 100.00, 3)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  venue = EXCLUDED.venue,
  starts_at = EXCLUDED.starts_at,
  capacity = EXCLUDED.capacity,
  seats_remaining = EXCLUDED.seats_remaining,
  member_price = EXCLUDED.member_price,
  non_member_price = EXCLUDED.non_member_price,
  created_by = EXCLUDED.created_by;

SELECT setval('events_id_seq', (SELECT MAX(id) FROM events));

-- 5. TICKETS
INSERT INTO tickets (id, ticket_code, event_id, user_id, price, price_type, payment_status, checkout_session_id, checked_in_at, checked_in_by) VALUES
(1, 'TKT-GALA-001', 1, 5, 300.00, 'member', 'paid', 'cs_test_ticket_001', NULL, NULL),
(2, 'TKT-GALA-002', 1, 7, 500.00, 'non_member', 'paid', 'cs_test_ticket_002', '2026-11-15 18:30:00+00', 4)
ON CONFLICT (id) DO UPDATE SET
  ticket_code = EXCLUDED.ticket_code,
  event_id = EXCLUDED.event_id,
  user_id = EXCLUDED.user_id,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  payment_status = EXCLUDED.payment_status,
  checkout_session_id = EXCLUDED.checkout_session_id,
  checked_in_at = EXCLUDED.checked_in_at,
  checked_in_by = EXCLUDED.checked_in_by;

SELECT setval('tickets_id_seq', (SELECT MAX(id) FROM tickets));

-- 6. PRODUCTS
INSERT INTO products (id, name, description, price, image_url) VALUES
(1, 'Club Hoodie', 'Heavyweight cotton fleece hoodie with embroidered Skyline crest.', 1200.00, '/images/hoodie.png'),
(2, 'Club T-Shirt', 'Official breathable cotton club crewneck t-shirt.', 600.00, '/images/tshirt.png')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url;

SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));

-- 7. PRODUCT SIZES
INSERT INTO product_sizes (id, product_id, size, stock) VALUES
(1, 1, 'S', 10),
(2, 1, 'M', 15),
(3, 1, 'L', 5),
(4, 1, 'XL', 8),
(5, 2, 'S', 20),
(6, 2, 'M', 25),
(7, 2, 'L', 15)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  size = EXCLUDED.size,
  stock = EXCLUDED.stock;

SELECT setval('product_sizes_id_seq', (SELECT MAX(id) FROM product_sizes));

-- 8. ORDERS
INSERT INTO orders (id, order_code, user_id, checkout_session_id, subtotal, discount, total, payment_status) VALUES
(1, 'ORD-2026-001', 5, 'cs_test_order_001', 1200.00, 120.00, 1080.00, 'paid'),
(2, 'ORD-2026-002', 7, 'cs_test_order_002', 600.00, 0.00, 600.00, 'pending')
ON CONFLICT (id) DO UPDATE SET
  order_code = EXCLUDED.order_code,
  user_id = EXCLUDED.user_id,
  checkout_session_id = EXCLUDED.checkout_session_id,
  subtotal = EXCLUDED.subtotal,
  discount = EXCLUDED.discount,
  total = EXCLUDED.total,
  payment_status = EXCLUDED.payment_status;

SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));

-- 9. ORDER ITEMS
INSERT INTO order_items (id, order_id, product_size_id, quantity, unit_price) VALUES
(1, 1, 2, 1, 1200.00),
(2, 2, 7, 1, 600.00)
ON CONFLICT (id) DO UPDATE SET
  order_id = EXCLUDED.order_id,
  product_size_id = EXCLUDED.product_size_id,
  quantity = EXCLUDED.quantity,
  unit_price = EXCLUDED.unit_price;

SELECT setval('order_items_id_seq', (SELECT MAX(id) FROM order_items));

-- 10. FUNDRAISERS
INSERT INTO fundraisers (id, title, description, created_by) VALUES
(1, 'Bake Sale', 'Raising funds for the annual student project showcase and community tech initiatives.', 1)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  created_by = EXCLUDED.created_by;

SELECT setval('fundraisers_id_seq', (SELECT MAX(id) FROM fundraisers));

-- 11. TASKS
INSERT INTO tasks (id, fundraiser_id, title, assignee_id, status) VALUES
(1, 1, 'Setup tables and promotional banners', 4, 'TODO'),
(2, 1, 'Coordinate volunteer bakers schedule', 3, 'IN_PROGRESS'),
(3, 1, 'Print recipe cards and packaging stickers', 5, 'COMPLETED')
ON CONFLICT (id) DO UPDATE SET
  fundraiser_id = EXCLUDED.fundraiser_id,
  title = EXCLUDED.title,
  assignee_id = EXCLUDED.assignee_id,
  status = EXCLUDED.status;

SELECT setval('tasks_id_seq', (SELECT MAX(id) FROM tasks));

-- 12. FUNDRAISER INCOME
INSERT INTO fundraiser_income (id, fundraiser_id, amount, note, recorded_by) VALUES
(1, 1, 1500.00, 'Campus square sales batch 1', 4)
ON CONFLICT (id) DO UPDATE SET
  fundraiser_id = EXCLUDED.fundraiser_id,
  amount = EXCLUDED.amount,
  note = EXCLUDED.note,
  recorded_by = EXCLUDED.recorded_by;

SELECT setval('fundraiser_income_id_seq', (SELECT MAX(id) FROM fundraiser_income));

-- 13. EXPENSES
INSERT INTO expenses (id, submitted_by, amount, description, receipt_url, status, approved_by, approved_at, reimbursed_by, reimbursed_at) VALUES
(1, 4, 250.00, 'Tablecloths and bake sale packaging material', 'https://example.com/receipts/packaging.pdf', 'reimbursed', 2, NOW(), 2, NOW())
ON CONFLICT (id) DO UPDATE SET
  submitted_by = EXCLUDED.submitted_by,
  amount = EXCLUDED.amount,
  description = EXCLUDED.description,
  receipt_url = EXCLUDED.receipt_url,
  status = EXCLUDED.status,
  approved_by = EXCLUDED.approved_by,
  approved_at = EXCLUDED.approved_at,
  reimbursed_by = EXCLUDED.reimbursed_by,
  reimbursed_at = EXCLUDED.reimbursed_at;

SELECT setval('expenses_id_seq', (SELECT MAX(id) FROM expenses));

-- 14. TRANSACTIONS
-- Note: source_id for fundraiser is fundraiser_income.id (1), NOT fundraiser.id
INSERT INTO transactions (id, source_type, source_id, user_id, amount, direction, payment_mode, status) VALUES
(1, 'dues', 1, 5, 500.00, 'in', 'online', 'paid'),
(2, 'ticket', 1, 5, 300.00, 'in', 'card', 'paid'),
(3, 'merch', 1, 5, 1080.00, 'in', 'online', 'paid'),
(4, 'fundraiser', 1, 4, 1500.00, 'in', 'cash', 'paid'),
(5, 'expense', 1, 4, 250.00, 'out', 'upi', 'paid')
ON CONFLICT (source_type, source_id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  amount = EXCLUDED.amount,
  direction = EXCLUDED.direction,
  payment_mode = EXCLUDED.payment_mode,
  status = EXCLUDED.status;

SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions));

COMMIT;

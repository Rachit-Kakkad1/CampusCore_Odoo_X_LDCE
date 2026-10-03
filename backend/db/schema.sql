-- Drop tables in reverse dependency order if recreating
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS fundraiser_income CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS fundraisers CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_sizes CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- 1. USERS
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'guest'
    CHECK (role IN ('admin', 'treasurer', 'event_manager', 'volunteer', 'member', 'guest')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. MEMBERSHIPS
-- -----------------------------------------------------------------------------
CREATE TABLE memberships (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_code VARCHAR(50) UNIQUE NOT NULL,
  dues_amount NUMERIC(10,2) NOT NULL DEFAULT 500.00 CHECK (dues_amount >= 0),
  dues_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (dues_status IN ('pending', 'paid')),
  start_date DATE,
  expiry_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. ANNOUNCEMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. EVENTS
-- -----------------------------------------------------------------------------
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  venue VARCHAR(255) NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  capacity INT NOT NULL CHECK (capacity >= 0),
  seats_remaining INT NOT NULL CHECK (seats_remaining >= 0 AND seats_remaining <= capacity),
  member_price NUMERIC(10,2) NOT NULL CHECK (member_price >= 0),
  non_member_price NUMERIC(10,2) NOT NULL CHECK (non_member_price >= 0),
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. TICKETS
-- -----------------------------------------------------------------------------
CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  ticket_code VARCHAR(64) UNIQUE NOT NULL,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  price_type VARCHAR(20) NOT NULL CHECK (price_type IN ('member', 'non_member')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid')),
  checkout_session_id VARCHAR(100) UNIQUE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. PRODUCTS & SIZES
-- -----------------------------------------------------------------------------
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE product_sizes (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(20) NOT NULL,
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  CONSTRAINT uq_product_size UNIQUE (product_id, size)
);

-- -----------------------------------------------------------------------------
-- 7. ORDERS & ORDER ITEMS
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_code VARCHAR(64) UNIQUE NOT NULL,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkout_session_id VARCHAR(100) UNIQUE,
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
  total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_size_id INT NOT NULL REFERENCES product_sizes(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
);

-- -----------------------------------------------------------------------------
-- 8. FUNDRAISERS, TASKS & FUNDRAISER INCOME
-- -----------------------------------------------------------------------------
CREATE TABLE fundraisers (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  fundraiser_id INT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  assignee_id INT REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE fundraiser_income (
  id SERIAL PRIMARY KEY,
  fundraiser_id INT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  recorded_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. EXPENSES
-- -----------------------------------------------------------------------------
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  submitted_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  receipt_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
  approved_by INT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  reimbursed_by INT REFERENCES users(id) ON DELETE SET NULL,
  reimbursed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. TRANSACTIONS (IDEMPOTENCY & FINANCIAL LEDGER)
-- -----------------------------------------------------------------------------
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL
    CHECK (source_type IN ('dues', 'ticket', 'merch', 'fundraiser', 'expense')),
  source_id INT NOT NULL,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('in', 'out')),
  payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash', 'online', 'upi', 'card')),
  status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_transaction_source UNIQUE (source_type, source_id)
);

-- -----------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE & RELIABILITY
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tasks_fundraiser_id ON tasks(fundraiser_id);
CREATE INDEX IF NOT EXISTS idx_fundraiser_income_fundraiser_id ON fundraiser_income(fundraiser_id);
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON expenses(submitted_by);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

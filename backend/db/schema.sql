-- Drop tables in reverse dependency order if recreating
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS fundraiser_income CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS fundraisers CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_sizes CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS event_volunteers CASCADE;
DROP TABLE IF EXISTS event_attendees CASCADE;
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
  role VARCHAR(50) NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'treasurer', 'event_manager', 'volunteer', 'member')),
  phone VARCHAR(50),
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. MEMBERSHIPS
-- -----------------------------------------------------------------------------
CREATE TABLE memberships (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_code VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'active',
        'expired',
        'cancelled'
      )
    ),
  dues_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (
      dues_status IN (
        'pending',
        'paid'
      )
    ),
  dues_amount NUMERIC(10,2) NOT NULL DEFAULT 500.00
    CHECK (dues_amount >= 0),
  started_at TIMESTAMP WITH TIME ZONE,
  expiry_date TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by INT REFERENCES users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  payment_timestamp TIMESTAMP WITH TIME ZONE,
  renewed_from_membership_id INT REFERENCES memberships(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure a user can have at most one currently active or pending membership,
-- while allowing historical records (expired/cancelled) for renewal audit trails.
CREATE UNIQUE INDEX IF NOT EXISTS uq_memberships_active_user
  ON memberships(user_id) WHERE status IN ('active', 'pending');



-- -----------------------------------------------------------------------------
-- 3. ANNOUNCEMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'important', 'urgent')),
  category VARCHAR(30) NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'event', 'urgent', 'academic', 'membership', 'finance')),
  status VARCHAR(20) NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published')),
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
  ends_at TIMESTAMP WITH TIME ZONE,
  capacity INT NOT NULL CHECK (capacity >= 0),
  seats_remaining INT NOT NULL CHECK (seats_remaining >= 0 AND seats_remaining <= capacity),
  member_price NUMERIC(10,2) NOT NULL CHECK (member_price >= 0),
  non_member_price NUMERIC(10,2) NOT NULL CHECK (non_member_price >= 0),
  volunteers_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  volunteers_required INT NOT NULL DEFAULT 0 CHECK (volunteers_required >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by INT REFERENCES users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  event_manager_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_manager_id ON events(event_manager_id);

-- -----------------------------------------------------------------------------
-- 5. EVENT ATTENDEES (GUEST ATTENDEES WITHOUT SYSTEM ACCOUNTS)
-- -----------------------------------------------------------------------------
CREATE TABLE event_attendees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  mobile VARCHAR(30) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. TICKETS
-- -----------------------------------------------------------------------------
CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  ticket_code VARCHAR(64) UNIQUE NOT NULL,
  fallback_code VARCHAR(10) UNIQUE,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE RESTRICT,
  attendee_id INT REFERENCES event_attendees(id) ON DELETE RESTRICT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  price_type VARCHAR(20) NOT NULL CHECK (price_type IN ('member', 'non_member')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid')),
  checkout_session_id VARCHAR(100) UNIQUE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by INT REFERENCES users(id) ON DELETE SET NULL,
  failed_fallback_attempts INT NOT NULL DEFAULT 0,
  last_failed_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_ticket_owner CHECK (
    (user_id IS NOT NULL AND attendee_id IS NULL)
    OR
    (user_id IS NULL AND attendee_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_tickets_fallback_code ON tickets(fallback_code);

-- -----------------------------------------------------------------------------
-- 7. EVENT VOLUNTEERS
-- -----------------------------------------------------------------------------
CREATE TABLE event_volunteers (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by INT REFERENCES users(id) ON DELETE SET NULL,
  removed_at TIMESTAMP WITH TIME ZONE,
  removed_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_event_volunteers_user UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_volunteers_event ON event_volunteers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_volunteers_user ON event_volunteers(user_id);

-- -----------------------------------------------------------------------------
-- 6. PRODUCTS & SIZES
-- -----------------------------------------------------------------------------
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
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
-- 8. FUNDRAISERS, TASKS, FUNDRAISER INCOME & DONATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE fundraisers (
  id SERIAL PRIMARY KEY,
  public_id VARCHAR(64) UNIQUE,
  slug VARCHAR(255) UNIQUE,
  title VARCHAR(255) NOT NULL,
  short_description TEXT,
  description TEXT,
  image_url TEXT,
  goal_amount NUMERIC(12,2) NOT NULL DEFAULT 10000.00 CHECK (goal_amount > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  start_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_at TIMESTAMP WITH TIME ZONE,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  fundraiser_id INT REFERENCES fundraisers(id) ON DELETE CASCADE,
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assignee_id INT REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled', 'pending', 'TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PENDING')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE fundraiser_income (
  id SERIAL PRIMARY KEY,
  fundraiser_id INT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  recorded_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE donations (
  id SERIAL PRIMARY KEY,
  public_id VARCHAR(64) UNIQUE NOT NULL,
  fundraiser_id INT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  donor_name VARCHAR(255) NOT NULL,
  donor_email VARCHAR(255) NOT NULL,
  donor_phone VARCHAR(50) NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'payment_failed', 'cancelled', 'refunded')),
  anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  message TEXT,
  payment_provider VARCHAR(50) NOT NULL DEFAULT 'online',
  payment_reference VARCHAR(100),
  idempotency_key VARCHAR(128) UNIQUE,
  refund_amount NUMERIC(10,2) DEFAULT 0.00 CHECK (refund_amount >= 0),
  refund_reason TEXT,
  refunded_by INT REFERENCES users(id) ON DELETE SET NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    CHECK (source_type IN ('dues', 'ticket', 'merch', 'fundraiser', 'fundraiser_refund', 'donation', 'donation_refund', 'expense')),
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
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_expiry_date ON memberships(expiry_date);
CREATE INDEX IF NOT EXISTS idx_memberships_renewed_from ON memberships(renewed_from_membership_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_email ON event_attendees(email);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_attendee_id ON tickets(attendee_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tasks_fundraiser_id ON tasks(fundraiser_id);
CREATE INDEX IF NOT EXISTS idx_fundraiser_income_fundraiser_id ON fundraiser_income(fundraiser_id);
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON expenses(submitted_by);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- -----------------------------------------------------------------------------
-- 11. USER SESSIONS & PASSWORD RESETS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  session_token VARCHAR(64) UNIQUE NOT NULL,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);

-- -----------------------------------------------------------------------------
-- 12. AUDIT LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request ON audit_logs(request_id);

-- -----------------------------------------------------------------------------
-- 13. IDEMPOTENCY KEYS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  request_hash VARCHAR(64) NOT NULL,
  response_status INT NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT uq_user_endpoint_idempotency UNIQUE(user_id, endpoint, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON idempotency_keys(user_id, endpoint, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON idempotency_keys(expires_at);

-- -----------------------------------------------------------------------------
-- 14. NOTIFICATIONS & OUTBOX EVENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS outbox_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id INT,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outbox_events_pending ON outbox_events(status, created_at ASC) WHERE status IN ('pending', 'processing');
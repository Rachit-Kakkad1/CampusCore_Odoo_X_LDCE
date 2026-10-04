-- Migration 020: Pagination Performance Optimization Indexes
-- Supports deterministic sort and filtered pagination across high-volume tables

-- 1. Memberships table
CREATE INDEX IF NOT EXISTS idx_memberships_status_created_at ON memberships(status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_memberships_dues_status ON memberships(dues_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memberships_user_created ON memberships(user_id, created_at DESC);

-- 2. Events table
CREATE INDEX IF NOT EXISTS idx_events_starts_at_id ON events(starts_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_events_status_starts_at ON events(status, starts_at ASC);

-- 3. Tickets table
CREATE INDEX IF NOT EXISTS idx_tickets_user_created ON tickets(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_event_payment ON tickets(event_id, payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_checked_in ON tickets(checked_in_at, created_at DESC);

-- 4. Event Volunteers table
CREATE INDEX IF NOT EXISTS idx_event_volunteers_event_status ON event_volunteers(event_id, status, applied_at ASC);
CREATE INDEX IF NOT EXISTS idx_event_volunteers_user ON event_volunteers(user_id, applied_at DESC);

-- 5. Donations table
CREATE INDEX IF NOT EXISTS idx_donations_fundraiser_status ON donations(fundraiser_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_user_created ON donations(user_id, created_at DESC);

-- 6. Notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- 7. Audit Logs table
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_id ON audit_logs(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);

-- 8. Transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_created_id ON transactions(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_source_dir ON transactions(source_type, direction, created_at DESC);

-- 9. Merchandise Orders table
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_id ON orders(created_at DESC, id DESC);

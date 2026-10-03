-- Migration 016: Membership Lifecycle
-- Adds complete lifecycle fields to memberships:
-- status ('pending', 'active', 'expired', 'cancelled'),
-- started_at, expiry_date, cancelled_at, cancellation_reason,
-- payment_timestamp, renewed_from_membership_id, updated_at.

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_timestamp TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS renewed_from_membership_id INT REFERENCES memberships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_memberships_active_user
  ON memberships(user_id) WHERE status IN ('active', 'pending');

CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_expiry_date ON memberships(expiry_date);
CREATE INDEX IF NOT EXISTS idx_memberships_renewed_from ON memberships(renewed_from_membership_id);

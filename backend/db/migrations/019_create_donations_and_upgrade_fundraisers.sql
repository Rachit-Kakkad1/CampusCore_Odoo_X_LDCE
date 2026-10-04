-- Migration 019: Fundraiser and Donation System

-- 1. Upgrade fundraisers table with rich metadata, goal amounts, dates, and status
ALTER TABLE fundraisers
  ADD COLUMN IF NOT EXISTS public_id VARCHAR(64) UNIQUE,
  ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS goal_amount NUMERIC(12,2) NOT NULL DEFAULT 10000.00 CHECK (goal_amount > 0),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_fundraisers_status ON fundraisers(status);
CREATE INDEX IF NOT EXISTS idx_fundraisers_slug ON fundraisers(slug);
CREATE INDEX IF NOT EXISTS idx_fundraisers_public_id ON fundraisers(public_id);

-- Populate existing rows with default public_id and slug if missing
UPDATE fundraisers
SET public_id = 'FND-' || id || '-' || SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 6),
    slug = LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || id
WHERE public_id IS NULL;

-- 2. Create donations table
CREATE TABLE IF NOT EXISTS donations (
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
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_fundraiser ON donations(fundraiser_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_user ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_public_id ON donations(public_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);

-- 3. Ensure transactions source_type supports 'fundraiser' and 'fundraiser_refund' if constraint exists
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_source_type_check;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_source_type_check
  CHECK (source_type IN ('dues', 'ticket', 'merch', 'fundraiser', 'fundraiser_refund', 'expense'));

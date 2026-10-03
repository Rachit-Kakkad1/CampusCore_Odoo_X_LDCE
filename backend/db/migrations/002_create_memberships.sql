-- 002_create_memberships.sql
CREATE TABLE IF NOT EXISTS memberships (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_code VARCHAR(50) UNIQUE NOT NULL,
    dues_amount NUMERIC(10,2) NOT NULL DEFAULT 500.00 CHECK (dues_amount >= 0),
    dues_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (dues_status IN ('pending', 'paid')),
    start_date DATE,
    expiry_date DATE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_expiry_date ON memberships(expiry_date);
CREATE INDEX IF NOT EXISTS idx_memberships_dues_status ON memberships(dues_status);

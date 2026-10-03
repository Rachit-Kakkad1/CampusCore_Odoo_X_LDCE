-- 012_create_fundraiser_income.sql
CREATE TABLE IF NOT EXISTS fundraiser_income (
    id SERIAL PRIMARY KEY,
    fundraiser_id INT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    note TEXT,
    recorded_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fundraiser_income_fundraiser_id ON fundraiser_income(fundraiser_id);

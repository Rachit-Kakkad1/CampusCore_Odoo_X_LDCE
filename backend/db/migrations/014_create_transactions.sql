-- 014_create_transactions.sql
-- Financial ledger table with idempotency constraint UNIQUE(source_type, source_id)
-- For fundraiser income: source_type = 'fundraiser' and source_id = fundraiser_income.id
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL
        CHECK (source_type IN ('dues', 'ticket', 'merch', 'fundraiser', 'expense')),
    source_id INT NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('in', 'out')),
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash', 'online', 'upi', 'card')),
    status VARCHAR(20) NOT NULL DEFAULT 'paid'
        CHECK (status IN ('pending', 'paid', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_transaction_source UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

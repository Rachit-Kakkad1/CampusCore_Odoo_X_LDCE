-- 013_create_expenses.sql
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    submitted_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    receipt_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
    approved_by INT REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    reimbursed_by INT REFERENCES users(id) ON DELETE SET NULL,
    reimbursed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON expenses(submitted_by);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

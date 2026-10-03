-- 004_create_events.sql
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    venue VARCHAR(255) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    capacity INT NOT NULL CHECK (capacity >= 0),
    seats_remaining INT NOT NULL CHECK (seats_remaining >= 0 AND seats_remaining <= capacity),
    member_price NUMERIC(10,2) NOT NULL CHECK (member_price >= 0),
    non_member_price NUMERIC(10,2) NOT NULL CHECK (non_member_price >= 0),
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);

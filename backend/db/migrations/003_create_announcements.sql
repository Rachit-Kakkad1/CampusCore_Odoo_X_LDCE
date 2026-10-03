-- 003_create_announcements.sql
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

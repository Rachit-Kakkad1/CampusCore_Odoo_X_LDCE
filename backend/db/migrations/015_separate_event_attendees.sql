-- 015_separate_event_attendees.sql
-- 1. Remove 'guest' from users.role and update default to 'member'
UPDATE users SET role = 'member' WHERE role = 'guest';

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'member';

DO $$
BEGIN
    -- Drop existing role check constraint on users
    EXECUTE (
        SELECT 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(conname)
        FROM pg_constraint
        WHERE conrelid = 'users'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%role%'
        LIMIT 1
    );
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'treasurer', 'event_manager', 'volunteer', 'member'));

-- 2. Create event_attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    mobile VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_email ON event_attendees(email);

-- 3. Modify tickets table to support both user and attendee ownership
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attendee_id INT REFERENCES event_attendees(id) ON DELETE RESTRICT;
ALTER TABLE tickets ALTER COLUMN user_id DROP NOT NULL;

DO $$
BEGIN
    ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_ticket_owner;
    ALTER TABLE tickets ADD CONSTRAINT chk_ticket_owner
        CHECK (
            (user_id IS NOT NULL AND attendee_id IS NULL)
            OR
            (user_id IS NULL AND attendee_id IS NOT NULL)
        );
END $$;

CREATE INDEX IF NOT EXISTS idx_tickets_attendee_id ON tickets(attendee_id);

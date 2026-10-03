-- Migration 017: Ticket Fallback Code, Event Volunteers, and Membership Cancellation Audit
-- 1. Add short fallback_code to tickets
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS fallback_code VARCHAR(10) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_tickets_fallback_code ON tickets(fallback_code);

-- Populate fallback_code for existing tickets if missing (5 unambiguous characters)
DO $$
DECLARE
    t_rec RECORD;
    v_code VARCHAR(10);
    chars CONSTANT TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    i INT;
    v_len INT := 5;
BEGIN
    FOR t_rec IN SELECT id FROM tickets WHERE fallback_code IS NULL LOOP
        LOOP
            v_code := '';
            FOR i IN 1..v_len LOOP
                v_code := v_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
            END LOOP;
            EXIT WHEN NOT EXISTS (SELECT 1 FROM tickets WHERE fallback_code = v_code);
        END LOOP;
        UPDATE tickets SET fallback_code = v_code WHERE id = t_rec.id;
    END LOOP;
END $$;

-- 2. Extend events table for volunteer management and event lifecycle filtering
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS volunteers_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS volunteers_required INT NOT NULL DEFAULT 0 CHECK (volunteers_required >= 0);

-- Backfill ends_at for existing events as starts_at + 3 hours if null
UPDATE events SET ends_at = starts_at + INTERVAL '3 hours' WHERE ends_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_lifecycle ON events(starts_at, ends_at);

-- 3. Extend memberships table with cancellation audit tracking
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS cancelled_by INT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_cancelled_by ON memberships(cancelled_by);

-- 4. Create event_volunteers table for volunteer application lifecycle
CREATE TABLE IF NOT EXISTS event_volunteers (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by INT REFERENCES users(id) ON DELETE SET NULL,
    removed_at TIMESTAMPTZ,
    removed_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_volunteers_user UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_volunteers_event ON event_volunteers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_volunteers_user ON event_volunteers(user_id);
CREATE INDEX IF NOT EXISTS idx_event_volunteers_status ON event_volunteers(status);

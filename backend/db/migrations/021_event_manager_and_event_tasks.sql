-- Migration 021: Event Manager Association and Event Volunteer Task Delegation
-- 1. Add event_manager_id to events table to assign dedicated event managers
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_manager_id INT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_events_event_manager_id ON events(event_manager_id);

-- 2. Enhance tasks table to support Event-specific tasks and volunteer task assignment
ALTER TABLE tasks ALTER COLUMN fundraiser_id DROP NOT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS event_id INT REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

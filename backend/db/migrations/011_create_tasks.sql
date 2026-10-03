-- 011_create_tasks.sql
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    fundraiser_id INT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    assignee_id INT REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'TODO'
        CHECK (status IN ('TODO', 'IN_PROGRESS', 'COMPLETED', 'todo', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_fundraiser_id ON tasks(fundraiser_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

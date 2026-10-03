// backend/scripts/migrate_announcements_schema.js
const { pool, query } = require('../db/connection');

async function migrateAnnouncements() {
  console.log('--- Migrating announcements table with priority, category, status, and published_at ---');

  await query(`
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normal'
      CHECK (priority IN ('normal', 'important', 'urgent'));
  `);

  await query(`
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'general'
      CHECK (category IN ('general', 'event', 'urgent', 'academic', 'membership', 'finance'));
  `);

  await query(`
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published'
      CHECK (status IN ('draft', 'published'));
  `);

  await query(`
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_announcements_status_category ON announcements(status, category);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
  `);

  console.log('✅ Announcements table migration complete.');
}

if (require.main === module) {
  migrateAnnouncements()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Migration error:', err);
      pool.end();
      process.exit(1);
    });
}

module.exports = { migrateAnnouncements };

const app = require('./app');
const env = require('./config/env');
const { testConnection } = require('./config/database');

async function startServer() {
  console.log('Connecting to PostgreSQL database...');
  const connected = await testConnection();
  if (!connected) {
    console.error('Fatal: Cannot start server without active database connection.');
    process.exit(1);
  }

  const syncMembershipStatuses = require('./shared/membership/syncMembershipStatuses');
  try {
    const { updatedCount } = await syncMembershipStatuses();
    if (updatedCount > 0) {
      console.log(`Synchronized membership lifecycle statuses: ${updatedCount} memberships expired.`);
    }
  } catch (err) {
    console.warn('Membership status sync warning on startup:', err.message);
  }

  // Periodic hourly sync
  setInterval(async () => {
    try {
      await syncMembershipStatuses();
    } catch (e) {
      console.warn('Periodic membership sync warning:', e.message);
    }
  }, 60 * 60 * 1000).unref();

  const server = app.listen(env.PORT, () => {
    console.log(`Student Organization System Backend running on port ${env.PORT}`);
    console.log(`Health check: http://localhost:${env.PORT}/health`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };

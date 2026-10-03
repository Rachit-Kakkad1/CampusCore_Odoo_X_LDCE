const env = require('./config/env');
const app = require('./app');
const { syncMembershipStatuses } = require('./shared/membership/syncMembershipStatuses');

const PORT = env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);

  // Run initial membership expiry synchronization on startup
  try {
    await syncMembershipStatuses();
  } catch (err) {
    console.error('Failed initial membership status synchronization:', err.message);
  }
});

